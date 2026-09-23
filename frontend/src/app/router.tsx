import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ProjectsPage } from '@/pages/projects/ProjectsPage'
import { NewProjectPage } from '@/pages/projects/NewProjectPage'
import { ProjectOverviewPage } from '@/pages/projects/ProjectOverviewPage'
import { EXTRA_ROUTES, NAV_ITEMS } from '@/data/navigation'

/** Screens delivered by Phase 2 (spec §18). */
const PROJECT_ROUTES = [
  { path: '/projects', element: <ProjectsPage /> },
  { path: '/projects/new', element: <NewProjectPage /> },
  { path: '/projects/:projectId', element: <ProjectOverviewPage /> },
]

const IMPLEMENTED: Record<string, React.ReactElement> = {
  '/': <DashboardPage />,
  '/settings': <SettingsPage />,
  ...Object.fromEntries(PROJECT_ROUTES.map((r) => [r.path, r.element])),
}

const PLACEHOLDER_PATHS = new Set(PROJECT_ROUTES.map((r) => r.path))

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      ...[...NAV_ITEMS, ...EXTRA_ROUTES]
        .filter((item) => !PLACEHOLDER_PATHS.has(item.path))
        .map((item) => ({
          path: item.path,
          element: IMPLEMENTED[item.path] ?? <PlaceholderPage item={item} />,
        })),
      ...PROJECT_ROUTES,
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
