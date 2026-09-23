import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Database, Monitor, Moon, RefreshCw, Server, Sun, Trash2, TriangleAlert } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Dialog, PageHeader, Skeleton } from '@/components/ui'
import { BackendStatusBadge } from '@/components/BackendStatusBadge'
import { useTheme } from '@/hooks/useTheme'
import { useStorageQuery } from '@/hooks/useStorage'
import { storageService } from '@/storage'
import { formatBytes } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { AppOutletContext } from '@/layouts/AppLayout'
import type { ThemePreference } from '@/types/settings'

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-small text-fg-secondary">{label}</dt>
      <dd className="text-right text-small font-medium text-fg">{children}</dd>
    </div>
  )
}

export function SettingsPage() {
  const { preference, setPreference } = useTheme()
  const { backend, recheckBackend } = useOutletContext<AppOutletContext>()
  const [confirmReset, setConfirmReset] = useState(false)
  const stats = useStorageQuery(() => storageService.getStats(), ['projects', 'analyses', 'settings'])

  return (
    <>
      <PageHeader title="Settings" description="Appearance, server connection and data stored in this browser." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Appearance" description="Choose how SYNEX AI looks on this device." icon={<Sun size={18} aria-hidden />} />
          <fieldset>
            <legend className="sr-only">Theme</legend>
            <div className="grid grid-cols-3 gap-2">
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <label
                  key={value}
                  className={cn(
                    'flex cursor-pointer flex-col items-center gap-2 rounded-md border p-4 text-small font-medium transition-colors',
                    'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary',
                    preference === value
                      ? 'border-primary bg-primary-soft text-primary'
                      : 'border-border text-fg-secondary hover:bg-surface-muted',
                  )}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={value}
                    checked={preference === value}
                    onChange={() => setPreference(value)}
                    className="sr-only"
                  />
                  <Icon size={20} aria-hidden />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </Card>

        <Card>
          <CardHeader
            title="Server & AI"
            description="The browser talks only to the SYNEX AI backend. API keys never leave the server."
            icon={<Server size={18} aria-hidden />}
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={recheckBackend}
                loading={backend.state === 'checking'}
                leftIcon={<RefreshCw size={14} aria-hidden />}
              >
                Recheck
              </Button>
            }
          />
          <dl className="divide-y divide-border">
            <Row label="Status">
              <BackendStatusBadge status={backend} />
            </Row>
            {backend.state === 'online' && (
              <>
                <Row label="Version">{backend.health.version}</Row>
                <Row label="Environment">{backend.health.environment}</Row>
                <Row label="AI provider">{backend.health.ai.provider}</Row>
                <Row label="AI credentials">{backend.health.ai.configured ? 'Configured' : 'Missing'}</Row>
              </>
            )}
          </dl>
          {backend.state === 'offline' && (
            <p role="alert" className="mt-3 rounded-md bg-error-soft p-3 text-small text-error">
              {backend.error.message} Your local project data is safe.
            </p>
          )}
          {backend.state === 'online' && !backend.health.ai.configured && (
            <p className="mt-3 rounded-md bg-warning-soft p-3 text-small text-warning">
              Add <code className="font-mono">GEMINI_API_KEY</code> to <code className="font-mono">backend/.env</code> and
              restart the backend to enable AI analysis.
            </p>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Local data"
            description="Projects and analyses are stored in this browser's LocalStorage. Clearing browser data removes them."
            icon={<Database size={18} aria-hidden />}
          />
          {stats.data ? (
            <dl className="grid gap-x-8 sm:grid-cols-2">
              <div className="divide-y divide-border">
                <Row label="Storage">{stats.data.persistent ? 'LocalStorage (persistent)' : 'Memory only (not saved)'}</Row>
                <Row label="Projects">{stats.data.projects}</Row>
              </div>
              <div className="divide-y divide-border">
                <Row label="Analysis versions">{stats.data.analysisVersions}</Row>
                <Row label="Approximate size">{formatBytes(stats.data.approxBytes)}</Row>
              </div>
            </dl>
          ) : (
            <Skeleton className="h-24 w-full" />
          )}
          {stats.data && !stats.data.persistent && (
            <p className="mt-3 flex items-start gap-2 rounded-md bg-warning-soft p-3 text-small text-warning">
              <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
              LocalStorage is unavailable in this browser. Data will be lost when the page is closed.
            </p>
          )}
          {stats.data && stats.data.corruptBackups > 0 && (
            <p className="mt-3 flex items-start gap-2 rounded-md bg-warning-soft p-3 text-small text-warning">
              <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
              {stats.data.corruptBackups} unreadable data entr{stats.data.corruptBackups === 1 ? 'y was' : 'ies were'} set
              aside. Resetting local data removes them.
            </p>
          )}
          <div className="mt-6 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-fg">Reset all local data</p>
              <p className="text-small text-fg-secondary">Permanently deletes every project, analysis and setting.</p>
            </div>
            <Button variant="destructive" leftIcon={<Trash2 size={16} aria-hidden />} onClick={() => setConfirmReset(true)}>
              Reset data
            </Button>
          </div>
        </Card>
      </div>

      <Dialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset all local data?"
        description={
          <>
            This permanently deletes{' '}
            <Badge tone="error">{stats.data?.projects ?? 0} projects</Badge> and{' '}
            <Badge tone="error">{stats.data?.analysisVersions ?? 0} analysis versions</Badge> from this browser. This
            cannot be undone.
          </>
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                storageService.resetAll()
                setConfirmReset(false)
              }}
            >
              Delete everything
            </Button>
          </>
        }
      />
    </>
  )
}
