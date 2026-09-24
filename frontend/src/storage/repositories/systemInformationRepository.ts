import type { KeyValueDriver } from '../driver'
import { PASSTHROUGH_MIGRATIONS, StoredValue, type IssueReporter } from '../collection'
import { STORAGE_KEYS } from '../keys'
import { contentOf, normaliseContent, normaliseSystemInformation } from '../systemInformationNormalisation'
import { ValidationError, type SystemInformationRepository } from './types'
import type { SystemInformation, SystemInformationContent, SystemInformationPatch } from '@/types/systemInformation'
import { createId } from '@/utils/id'
import { isNonEmptyString } from '@/utils/guards'

/**
 * One system-information record per project, all of them under a single key
 * (`synex_system_information`) — never one ad-hoc key per project.
 *
 * Records are upserted: creating happens on the first save, so the workspace
 * can auto-save before every required field has a value.
 */
export class LocalStorageSystemInformationRepository implements SystemInformationRepository {
  private readonly store: StoredValue<SystemInformation[]>

  constructor(driver: KeyValueDriver, onIssue?: IssueReporter) {
    this.store = new StoredValue<SystemInformation[]>({
      driver,
      key: STORAGE_KEYS.systemInformation,
      fallback: () => [],
      parse: (data) => normaliseSystemInformation(data),
      // The key was introduced in Phase 3, so there is nothing to migrate into it.
      migrations: PASSTHROUGH_MIGRATIONS,
      onIssue,
    })
  }

  async list() {
    return this.store.read()
  }

  async get(projectId: string) {
    if (!isNonEmptyString(projectId)) return null
    return this.store.read().find((r) => r.projectId === projectId) ?? null
  }

  async save(projectId: string, content: SystemInformationContent) {
    return this.upsert(projectId, content)
  }

  async update(projectId: string, patch: SystemInformationPatch) {
    const existing = await this.get(projectId)
    if (!existing) return this.upsert(projectId, patch)
    const { content } = normaliseContent({ ...contentOf(existing), ...patch })
    return this.upsert(projectId, content)
  }

  async delete(projectId: string) {
    return (await this.deleteByProject(projectId)) > 0
  }

  async deleteByProject(projectId: string) {
    const all = this.store.read()
    const remaining = all.filter((r) => r.projectId !== projectId)
    const removed = all.length - remaining.length
    if (removed > 0) this.store.write(remaining)
    return removed
  }

  async countAll() {
    return this.store.read().length
  }

  /**
   * `updatedAt` only moves when the content actually changed, so an auto-save
   * tick that writes the same text again does not look like an edit.
   */
  private upsert(projectId: string, incoming: Partial<SystemInformationContent>): SystemInformation {
    if (!isNonEmptyString(projectId)) throw new ValidationError('System information must belong to a project.')
    const { content } = normaliseContent(incoming)
    const all = this.store.read()
    const index = all.findIndex((r) => r.projectId === projectId)
    const now = new Date().toISOString()

    if (index === -1) {
      const created: SystemInformation = { id: createId(), projectId, ...content, createdAt: now, updatedAt: now }
      this.store.write([...all, created])
      return created
    }

    const current = all[index]
    const unchanged = JSON.stringify(contentOf(current)) === JSON.stringify(content)
    const next: SystemInformation = {
      ...current,
      ...content,
      id: current.id,
      projectId,
      createdAt: current.createdAt,
      updatedAt: unchanged ? current.updatedAt : now,
    }
    if (unchanged) return current

    const updated = [...all]
    updated[index] = next
    this.store.write(updated)
    return next
  }
}
