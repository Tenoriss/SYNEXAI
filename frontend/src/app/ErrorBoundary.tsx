import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  hasError: boolean
}

/** Last-resort boundary: explains what happened and reassures that data is safe. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[SYNEX] UI error', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div role="alert" className="flex min-h-dvh items-center justify-center p-6">
        <div className="max-w-md rounded-lg border border-border bg-surface p-8 text-center">
          <h1 className="text-h4 text-fg">Something went wrong</h1>
          <p className="mt-2 text-small text-fg-secondary">
            The interface hit an unexpected error. Your projects stored in this browser are safe.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex h-11 items-center rounded-control bg-primary px-4 text-small font-medium text-on-primary hover:bg-primary-hover"
          >
            Reload SYNEX AI
          </button>
        </div>
      </div>
    )
  }
}
