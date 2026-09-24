import type { KeyValueDriver } from '../driver'
import { PASSTHROUGH_MIGRATIONS, StoredValue, type IssueReporter, type Migration } from '../collection'
import { STORAGE_KEYS } from '../keys'
import { isAnalysisRecord, normaliseAnalysisRecords, upgradeAnalysisRecordToV3 } from '../validators'
import { NotFoundError, ValidationError, type AnalysisRepository } from './types'
import type { AnalysisRecord, AnalysisTaskType, NewAnalysisRecord } from '@/types/analysis'
import { createId } from '@/utils/id'
import { isNonEmptyString, isRecord } from '@/utils/guards'

const newestFirst = (a: AnalysisRecord, b: AnalysisRecord) => b.createdAt.localeCompare(a.createdAt)

/**
 * Analysis results, one append-only record per run, keyed by project.
 *
 * Two rules the UI depends on and this layer enforces:
 *  • `create` never modifies an existing record — regenerating keeps history.
 *  • a record whose result fails validation is rejected at write time, so no
 *    unvalidated AI text can be stored as trusted analysis.
 */
export class LocalStorageAnalysisRepository implements AnalysisRepository {
  private readonly store: StoredValue<AnalysisRecord[]>

  constructor(driver: KeyValueDriver, onIssue?: IssueReporter) {
    // v1 and v2 both stored the Phase 1/2 shape (`inputSnapshot` + raw result).
    const migrations: Record<number, Migration> = { ...PASSTHROUGH_MIGRATIONS, 1: migrateLegacy, 2: migrateLegacy }
    this.store = new StoredValue<AnalysisRecord[]>({
      driver,
      key: STORAGE_KEYS.analysisVersions,
      fallback: () => [],
      parse: normaliseAnalysisRecords,
      migrations,
      onIssue,
    })
  }

  async listByProject(projectId: string): Promise<AnalysisRecord[]> {
    return this.store
      .read()
      .filter((record) => record.projectId === projectId)
      .sort(newestFirst)
  }

  async listAll(): Promise<AnalysisRecord[]> {
    return this.store.read()
  }

  async getLatest(projectId: string): Promise<AnalysisRecord | null> {
    return this.store.read().filter((record) => record.projectId === projectId).sort(newestFirst)[0] ?? null
  }

  async get(id: string): Promise<AnalysisRecord | null> {
    return this.store.read().find((record) => record.id === id) ?? null
  }

  async create(input: NewAnalysisRecord): Promise<AnalysisRecord> {
    if (!isNonEmptyString(input.projectId)) throw new ValidationError('An analysis must belong to a project.')
    if (!isRecord(input.input)) throw new ValidationError('An analysis must record the input it was based on.')
    if (!isRecord(input.result)) throw new ValidationError('An analysis result must be a validated object.')
    if (!isRecord(input.meta)) throw new ValidationError('An analysis result must carry its run metadata.')

    const now = new Date().toISOString()
    const record: AnalysisRecord = {
      id: createId(),
      projectId: input.projectId,
      type: (input.type ?? 'system-understanding') as AnalysisTaskType,
      createdAt: now,
      updatedAt: now,
      sourceInformationUpdatedAt: input.sourceInformationUpdatedAt,
      // Deep copy: a later autosave of the form must never rewrite history.
      input: structuredClone(input.input),
      result: structuredClone(input.result),
      meta: structuredClone(input.meta),
    }

    if (!isAnalysisRecord(record)) throw new ValidationError('Analysis record failed the storage invariants.')
    this.store.write([...this.store.read(), record])
    return record
  }

  async delete(id: string): Promise<void> {
    const all = this.store.read()
    const remaining = all.filter((record) => record.id !== id)
    if (remaining.length === all.length) throw new NotFoundError('Analysis', id)
    this.store.write(remaining)
  }

  async deleteByProject(projectId: string): Promise<number> {
    const all = this.store.read()
    const remaining = all.filter((record) => record.projectId !== projectId)
    const removed = all.length - remaining.length
    if (removed > 0) this.store.write(remaining)
    return removed
  }

  async countAll(): Promise<number> {
    return this.store.read().length
  }
}

function migrateLegacy(data: unknown): unknown {
  if (!Array.isArray(data)) return data
  return data.map(upgradeAnalysisRecordToV3)
}
