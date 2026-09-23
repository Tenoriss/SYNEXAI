import { Link } from 'react-router-dom'
import { ArrowLeft, Construction } from 'lucide-react'
import { Badge, Button, Card, EmptyState, PageHeader } from '@/components/ui'
import type { NavItem } from '@/data/navigation'

/** Honest placeholder for screens delivered in later phases — no mock content. */
export function PlaceholderPage({ item }: { item: NavItem }) {
  return (
    <>
      <PageHeader title={item.label} description={item.description} />
      <Card>
        <EmptyState
          icon={<item.icon size={22} aria-hidden />}
          title="Not available yet"
          description={`This screen is part of development phase ${item.phase}. It will show real results once that phase is built.`}
          action={
            <div className="flex flex-col items-center gap-4">
              <Badge icon={<Construction size={14} aria-hidden />}>Planned · Phase {item.phase}</Badge>
              <Link to="/">
                <Button variant="secondary" leftIcon={<ArrowLeft size={16} aria-hidden />} tabIndex={-1}>
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          }
        />
      </Card>
    </>
  )
}
