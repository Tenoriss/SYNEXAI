import { RouterProvider } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { ThemeProvider } from './ThemeProvider'
import { ToastProvider } from './ToastProvider'
import { ErrorBoundary } from './ErrorBoundary'
import { router } from './router'

export function App() {
  return (
    <ErrorBoundary>
      {/* Respect the OS "reduce motion" setting for every Framer Motion animation. */}
      <MotionConfig reducedMotion="user">
        <ThemeProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </ThemeProvider>
      </MotionConfig>
    </ErrorBoundary>
  )
}
