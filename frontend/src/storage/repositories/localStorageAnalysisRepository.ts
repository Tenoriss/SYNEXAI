import type { KeyValueDriver } from '../driver'
import { PASSTHROUGH_MIGRATIONS, StoredValue, parseArray, type IssueReporter } from '../collection'
import { STORAGE_KEYS } from '../keys'
import { isAnalysisVersion, isSystemInput } from '../validators'
import { NotFoundError, ValidationError, type AnalysisRepository } from './types'
import type { AnalysisVersion, NewAnalysisVersion } from '@/types/analysis'
import { createId } from '@/utils/id'
import { isNonEmptyString, isRecord } from '@/utils/guards'

const newestFirst = (a: AnalysisVersion, b: AnalysisVersion) => b.createdAt.localeCompare(a.createdAt)

export class LocalStorageAnalysisRepository implements AnalysisRepository {
  private readonly store: StoredValue<AnalysisVersion[]>

  constructor(driver: KeyValueDriver, onIssue?: IssueReporter) {
    this.store = new StoredValue<AnalysisVersion[]>({
      driver,
      key: STORAGE_KEYS.analysisVersions,
      fallback: () => [],
      parse: (data) => parseArray(data, isAnalysisVersion),
      // Analysis history is unchanged in schema v2.
      migrations: PASSTHROUGH_MIGRATIONS,
      onIssue,
    })
  }

  async listByProject(projectId: string) {
    return this.store
      .read()
      .filter((v) => v.projectId === projectId)
      .sort(newestFirst)
  }

  async get(id: string) {
    return this.store.read().find((v) => v.id === id) ?? null
  }

  async create(input: NewAnalysisVersion) {
    if (!isNonEmptyString(input.projectId)) throw new ValidationError('Analysis must belong to a project.')
    if (!isSystemInput(input.inputSnapshot)) throw new ValidationError('Analysis input snapshot is invalid.')
    if (!isRecord(input.analysisResult)) throw new ValidationError('Analysis result must be an object.')

    const version: AnalysisVersion = {
      id: createId(),
      projectId: input.projectId,
      createdAt: new Date().toISOString(),
      // Deep-copy so later edits to the form or result can't mutate history.
      inputSnapshot: structuredClone(input.inputSnapshot),
      analysisResult: structuredClone(input.analysisResult),
    }
    this.store.write([...this.store.read(), version])
    return version
  }

  async delete(id: string) {
    const all = this.store.read()
    const remaining = all.filter((v) => v.id !== id)
    if (remaining.length === all.length) throw new NotFoundError('Analysis', id)
    this.store.write(remaining)
  }

  async deleteByProject(projectId: string) {
    const all = this.store.read()
    const remaining = all.filter((v) => v.projectId !== projectId)
    const removed = all.length - remaining.length
    if (removed > 0) this.store.write(remaining)
    return removed
  }

  async countAll() {
    return this.store.read().length
  }
}
