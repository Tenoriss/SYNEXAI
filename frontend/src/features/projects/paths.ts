/** Canonical link for a project. Kept here so list, card and header agree. */
export function projectPath(projectId: string): string {
  return `/projects/${projectId}`
}
