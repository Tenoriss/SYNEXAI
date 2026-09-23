import type { ApiErrorBody, HealthResponse } from '@/types/api'
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
const BASE_URL = '/api'

interface RequestOptions {
  method?: 'GET' | 'POST'
  body?: unknown
  timeoutMs?: number
  signal?: AbortSignal
}

function kindForStatus(status: number): ApiErrorKind {
  if (status === 404) return 'not_found'
  if (status === 422 || status === 400) return 'validation'
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
    throw new ApiError(kind, body?.message || FALLBACK_MESSAGES[kind], res.status, body?.code || kind)
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
}
