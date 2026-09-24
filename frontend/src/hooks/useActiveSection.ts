import { useEffect, useState } from 'react'

/**
 * Tracks which section the analyst is looking at so the side navigation can
 * mark it (spec §8: "the analyst should always understand where they are").
 * Only element ids are observed — no scrolling is performed here.
 */
export function useActiveSection(ids: readonly string[], enabled = true): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null)
  const key = ids.join('|')

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') return
    const visible = new Set<string>()

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id)
          else visible.delete(entry.target.id)
        }
        const ordered = key.split('|').filter((id) => visible.has(id))
        if (ordered.length > 0) setActive(ordered[0])
      },
      // The header is sticky, so ignore the strip underneath it.
      { rootMargin: '-88px 0px -55% 0px', threshold: [0, 0.2, 0.6] },
    )

    for (const id of key.split('|')) {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [key, enabled])

  return active
}
