import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { EXTRA_ROUTES, NAV_ITEMS } from '@/data/navigation'

const IMPLEMENTED: Record<string, React.ReactElement> = {
  '/': <DashboardPage />,
  '/settings': <SettingsPage />,
}

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      ...[...NAV_ITEMS, ...EXTRA_ROUTES].map((item) => ({
        path: item.path,
        element: IMPLEMENTED[item.path] ?? <PlaceholderPage item={item} />,
      })),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
