export interface HealthResponse {
  status: 'ok'
  service: string
  version: string
  environment: string
  ai: {
    provider: string
    supported: boolean
    configured: boolean
  }
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    details?: { field?: string; message?: string }[]
  }
}
