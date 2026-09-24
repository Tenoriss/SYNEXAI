import type { ApiErrorBody, HealthResponse } from '@/types/api'
import type { AnalysisTaskInfo, SystemUnderstandingResponse } from '@/types/analysis'
import { parseSystemUnderstandingResponse } from '@/features/analysis/responseGuards'
import { buildSystemUnderstandingPayload, type AnalyzeRequestSource } from '@/features/analysis/requestPayload'
import { isRecord } from '@/utils/guards'

/**
 * HTTP client for the SYNEX AI backend.
 *
 * The browser only calls relative `/api/*` URLs (proxied by Vite in dev), so the
 * frontend never needs to know the backend host and never talks to Gemini.
 */

export type ApiErrorKind = 'network' | 'timeout' | 'server' | 'validation' | 'rate_limit' | 'not_found' | 'unknown'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | null
  readonly code: string

  constructor(kind: ApiErrorKind, message: string, status: number | null = null, code: string = kind) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.code = code
  }
}

const DEFAULT_TIMEOUT_MS = 15_000

/**
 * An AI request is not a database read: the backend waits for the model. The
 * client therefore allows the backend's own timeout (`AI_TIMEOUT_SECONDS`, 120s
 * by default) to fire first, so the analyst sees the backend's precise message
 * instead of a generic browser-level abort.
 */
const ANALYSIS_TIMEOUT_MS = 150_000

/** Relative by default: Vite proxies /api to the backend, so no host is baked in. */
const BASE_URL = import.meta.env?.VITE_API_BASE_URL ?? '/api'

interface RequestOptions {
  method?: 'GET' | 'POST'
  body?: unknown
  timeoutMs?: number
  signal?: AbortSignal
}

function kindForStatus(status: number): ApiErrorKind {
  if (status === 404) return 'not_found'
  if (status === 422 || status === 400 || status === 501) return 'validation'
  if (status === 429) return 'rate_limit'
  if (status >= 500) return 'server'
  return 'unknown'
}

const FALLBACK_MESSAGES: Record<ApiErrorKind, string> = {
  network: 'Could not reach the SYNEX AI server. Check that the backend is running.',
  timeout: 'The server took too long to respond. Please try again.',
  server: 'The server ran into a problem. Please try again.',
  validation: 'Some of the submitted information is invalid.',
  rate_limit: 'Too many requests. Please wait a moment and try again.',
  not_found: 'The requested resource was not found.',
  unknown: 'Something went wrong. Please try again.',
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort('timeout'), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  const onExternalAbort = () => controller.abort('cancelled')
  opts.signal?.addEventListener('abort', onExternalAbort)

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: opts.method ?? 'GET',
      headers: { Accept: 'application/json', ...(opts.body !== undefined && { 'Content-Type': 'application/json' }) },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    })
  } catch (err) {
    if (controller.signal.aborted && controller.signal.reason === 'timeout') {
      throw new ApiError('timeout', FALLBACK_MESSAGES.timeout)
    }
    if (controller.signal.aborted) throw err
    throw new ApiError('network', FALLBACK_MESSAGES.network)
  } finally {
    clearTimeout(timeout)
    opts.signal?.removeEventListener('abort', onExternalAbort)
  }

  let payload: unknown = null
  const text = await res.text()
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  if (!res.ok) {
    const kind = kindForStatus(res.status)
    // A proxy returning HTML/empty 5xx usually means the backend is down.
    if (payload === null && (res.status === 502 || res.status === 503 || res.status === 504 || res.status === 500)) {
      throw new ApiError('network', FALLBACK_MESSAGES.network, res.status)
    }
    const body = isRecord(payload) && isRecord(payload.error) ? (payload.error as ApiErrorBody['error']) : null
    const code = body?.code || kind
    const kind2 = res.status === 504 && code === 'AI_TIMEOUT' ? 'timeout' : kind
    throw new ApiError(kind2, body?.message || FALLBACK_MESSAGES[kind2], res.status, code)
  }

  if (payload === null) throw new ApiError('server', 'The server returned an unexpected response.', res.status)
  return payload as T
}

function isHealthResponse(v: unknown): v is HealthResponse {
  return (
    isRecord(v) &&
    v.status === 'ok' &&
    typeof v.service === 'string' &&
    isRecord(v.ai) &&
    typeof v.ai.provider === 'string' &&
    typeof v.ai.configured === 'boolean'
  )
}

export const ApiService = {
  async health(signal?: AbortSignal): Promise<HealthResponse> {
    const data = await request<unknown>('/health', { signal, timeoutMs: 5_000 })
    if (!isHealthResponse(data)) throw new ApiError('server', 'The server returned an unexpected health response.')
    return data
  },

  /**
   * Runs the system-understanding analysis. The browser talks to the SYNEX AI
   * backend only; the backend owns the Gemini call and the API key.
   *
   * The response is re-validated here: raw model text is never trusted, and a
   * response that does not match the documented shape becomes an error instead of
   * being stored as an analysis.
   */
  async analyzeSystemUnderstanding(
    payload: AnalyzeRequestSource,
    signal?: AbortSignal,
  ): Promise<SystemUnderstandingResponse> {
    const data = await request<unknown>('/analyze/system-understanding', {
      method: 'POST',
      body: buildSystemUnderstandingPayload(payload),
      signal,
      timeoutMs: ANALYSIS_TIMEOUT_MS,
    })
    const parsed = parseSystemUnderstandingResponse(data)
    if (!parsed) {
      throw new ApiError('server', 'The AI response did not match the expected structure. Nothing was stored.')
    }
    return parsed
  },

  /** Which analysis tasks this server can run — used to explain what is not available. */
  async analysisTasks(signal?: AbortSignal): Promise<AnalysisTaskInfo[]> {
    const data = await request<unknown>('/analyze/tasks', { signal, timeoutMs: 5_000 })
    if (!isRecord(data) || !Array.isArray(data.data)) return []
    return data.data
      .filter(isRecord)
      .map((item): AnalysisTaskInfo => ({
        type: typeof item.type === 'string' ? item.type : '',
        label: typeof item.label === 'string' ? item.label : '',
        status: item.status === 'available' ? 'available' : 'not-implemented',
        note: typeof item.note === 'string' ? item.note : '',
      }))
  },
}
