import { CircleCheck, CircleAlert, CircleDashed, CircleX } from 'lucide-react'
import { Badge } from './ui'
import type { BackendStatus } from '@/hooks/useBackendHealth'

/** Compact server/AI status. Icon + text, never colour alone. */
export function BackendStatusBadge({ status }: { status: BackendStatus }) {
  if (status.state === 'checking')
    return (
      <Badge icon={<CircleDashed size={14} className="animate-spin" aria-hidden />}>Checking server</Badge>
    )
  if (status.state === 'offline')
    return (
      <Badge tone="error" icon={<CircleX size={14} aria-hidden />}>
        Server offline
      </Badge>
    )
  if (!status.health.ai.configured)
    return (
      <Badge tone="warning" icon={<CircleAlert size={14} aria-hidden />}>
        AI not configured
      </Badge>
    )
  return (
    <Badge tone="success" icon={<CircleCheck size={14} aria-hidden />}>
      Server ready
    </Badge>
  )
}
