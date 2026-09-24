export interface HealthResponse {
  status: 'ok'
  service: string
  version: string
  environment: string
  ai: {
    provider: string
    supported: boolean
    /** True when a key is present in `backend/.env`. The key itself is never sent. */
    configured: boolean
    /** Configured model id, so the UI can show what will run before it runs. */
    model?: string | null
    /** Timeout budget the backend enforces per AI request. */
    timeoutSeconds?: number
  }
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    details?: { field?: string; message?: string }[]
  }
}
