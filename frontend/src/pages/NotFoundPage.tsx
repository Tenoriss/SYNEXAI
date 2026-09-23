import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button, Card, EmptyState } from '@/components/ui'

export function NotFoundPage() {
  return (
    <Card>
      <EmptyState
        icon={<Compass size={22} aria-hidden />}
        title="Page not found"
        description="The page you are looking for doesn't exist or has moved."
        action={
          <Link to="/">
            <Button tabIndex={-1}>Go to Dashboard</Button>
          </Link>
        }
      />
    </Card>
  )
}
