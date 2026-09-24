import { useCallback, useEffect, useMemo, useRef } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  FileSearch,
  KeyRound,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Skeleton,
} from "@/components/ui";
import { AnalysisMetaBar } from "@/components/analysis/AnalysisMetaBar";
import { AnalysisNotice } from "@/components/analysis/AnalysisNotice";
import { AnalysisRunning } from "@/components/analysis/AnalysisRunning";
import { SystemUnderstandingResult } from "@/components/analysis/SystemUnderstandingResult";
import { emptySections } from "@/features/analysis/provenance";
import { runPreflight } from "@/features/analysis/preflight";
import { projectPath } from "@/features/projects/paths";
import { systemInformationPath } from "@/features/systemInformation/paths";
import { useAnalysis } from "@/hooks/useAnalysis";
import { useBackendHealth } from "@/hooks/useBackendHealth";
import { useProject } from "@/hooks/useProjects";
import { useSystemInformationRecord } from "@/hooks/useSystemInformation";
import { formatRelativeTime } from "@/utils/format";

/**
 * The system-understanding result for one project (Phase 4).
 *
 * The page never calls a model directly: it posts the saved System Information to
 * the SYNEX AI backend, which owns the provider call and validates the answer.
 * The analyst's input is only read here — saving an analysis never writes to it.
 */
export function SystemUnderstandingPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const reduce = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();
  const { project, loading: projectLoading, missing } = useProject(projectId);
  const {
    record: siRecord,
    content,
    loading: siLoading,
  } = useSystemInformationRecord(projectId);
  const { status: backendStatus } = useBackendHealth();
  const analysis = useAnalysis(projectId, content, {
    sourceUpdatedAt: siRecord?.updatedAt ?? null,
  });
  const autoRunRef = useRef(false);

  const preflight = useMemo(() => runPreflight(content), [content]);
  const missingSections = useMemo(
    () => (content ? emptySections(content) : []),
    [content],
  );

  // "Analyze System" arrives with ?run=1: start once, then clear the flag so a
  // refresh shows the stored result instead of silently spending another request.
  useEffect(() => {
    if (searchParams.get("run") !== "1") return;
    setSearchParams({}, { replace: true });
    if (autoRunRef.current || !content || siLoading) return;
    autoRunRef.current = true;
    void analysis.analyze();
  }, [analysis, content, searchParams, siLoading, setSearchParams]);

  const handleAnalyze = useCallback(() => {
    void analysis.analyze();
  }, [analysis]);

  if (projectLoading || siLoading || (analysis.loading && !analysis.record)) {
    return (
      <>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-6 h-10 w-2/3" />
        <Skeleton className="mt-4 h-4 w-1/2" />
        <div className="mt-6 space-y-6">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    );
  }

  if (missing || !project || !projectId) {
    return (
      <>
        <BackLink projectId={projectId} name={project?.name} />
        <Card>
          <EmptyState
            icon={<FileSearch size={22} aria-hidden />}
            title="Project not found"
            description="A system understanding belongs to a project, and this project is not stored in this browser. Nothing was created or changed."
            action={
              <Link to="/projects">
                <Button
                  variant="secondary"
                  leftIcon={<ArrowLeft size={16} aria-hidden />}
                  tabIndex={-1}
                >
                  Back to Projects
                </Button>
              </Link>
            }
          />
        </Card>
      </>
    );
  }

  const aiConfigured =
    backendStatus.state === "online"
      ? backendStatus.health.ai.configured
      : null;
  const model =
    backendStatus.state === "online"
      ? (backendStatus.health.ai.model ?? null)
      : null;
  const { record, phase, running, failure } = analysis;
  const showRunning = running;
  const showBlocked = !record && !running && preflight.status === "blocked";

  return (
    <>
      <BackLink projectId={projectId} name={project.name} />

      <PageHeader
        title="System Understanding"
        description="A structured reading of the system information you recorded, produced by the AI provider configured on the backend. It restates your input; it does not add to it."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {record ? (
              <Button
                variant="secondary"
                leftIcon={<RefreshCw size={16} aria-hidden />}
                loading={running}
                disabled={running || preflight.status === "blocked"}
                onClick={handleAnalyze}
              >
                Regenerate Analysis
              </Button>
            ) : (
              <Button
                leftIcon={<Bot size={16} aria-hidden />}
                loading={running}
                disabled={running || preflight.status === "blocked"}
                onClick={handleAnalyze}
              >
                Analyze System
              </Button>
            )}
            <Link to={systemInformationPath(projectId)}>
              <Button
                variant="ghost"
                leftIcon={<ArrowRight size={16} aria-hidden />}
                tabIndex={-1}
              >
                Edit input
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-small text-fg-secondary">
        <Badge tone={record ? "success" : "neutral"}>
          {record ? "Result saved" : "No result yet"}
        </Badge>
        {analysis.historyCount > 1 && (
          <span className="tabular-nums">
            {analysis.historyCount} runs stored for this project · newest shown
          </span>
        )}
        <span className="text-fg-muted">
          {model
            ? `Provider: ${backendStatus.state === "online" ? backendStatus.health.ai.provider : "—"} · model ${model}`
            : "Provider status unknown"}
        </span>
        {siRecord && (
          <span className="text-fg-muted">
            Input last saved {formatRelativeTime(siRecord.updatedAt)}
          </span>
        )}
      </div>

      {aiConfigured === false && (
        <p
          role="status"
          className="mb-6 flex items-start gap-2 rounded-md border border-warning/30 bg-warning-soft p-3 text-small text-warning"
        >
          <KeyRound size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            The backend is reachable but has no AI key configured, so an
            analysis request will be refused rather than guessed at. Add{" "}
            <code className="rounded-sm bg-surface px-1 py-0.5 font-mono text-caption">
              GEMINI_API_KEY
            </code>{" "}
            to{" "}
            <code className="rounded-sm bg-surface px-1 py-0.5 font-mono text-caption">
              backend/.env
            </code>{" "}
            and restart the server.
          </span>
        </p>
      )}

      {backendStatus.state === "offline" && (
        <p
          role="status"
          className="mb-6 flex items-start gap-2 rounded-md border border-error/30 bg-error-soft p-3 text-small text-error"
        >
          <ShieldCheck size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            The SYNEX AI backend is not reachable, so no analysis can run. Saved
            input is unaffected. Start it with{" "}
            <code className="rounded-sm bg-surface px-1 py-0.5 font-mono text-caption">
              uvicorn app.main:app --port 8000
            </code>{" "}
            from the backend folder.
          </span>
        </p>
      )}

      {failure && (
        <div className="mb-6">
          {
            <AnalysisNotice
              failure={failure}
              projectId={projectId}
              onRetry={handleAnalyze}
              onDismiss={analysis.dismissFailure}
            />
          }
        </div>
      )}

      {showRunning && (
        <div className="mb-6">
          <AnalysisRunning
            phase={phase}
            elapsedMs={analysis.elapsedMs}
            onCancel={analysis.cancel}
            reducedMotion={!!reduce}
          />
        </div>
      )}

      {showBlocked && (
        <Card className="mb-6">
          <EmptyState
            icon={<FileSearch size={22} aria-hidden />}
            title="Not enough input to analyze yet"
            description={
              preflight.status === "blocked"
                ? `${preflight.issues.map((issue) => issue.message).join(" ")} SYNEX AI will not send an empty request just to get something back.`
                : "Record the system information first."
            }
            action={
              <Link to={systemInformationPath(projectId)}>
                <Button
                  leftIcon={<ArrowRight size={16} aria-hidden />}
                  tabIndex={-1}
                >
                  Go to System Information
                </Button>
              </Link>
            }
          />
        </Card>
      )}

      {record ? (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="space-y-6"
        >
          <AnalysisMetaBar
            record={record}
            sourceUpdatedAt={siRecord?.updatedAt ?? null}
            versionCount={analysis.historyCount}
          />
          {preflight.status === "ready" && preflight.warning && (
            <p className="rounded-md bg-surface-muted p-3 text-caption text-fg-secondary">
              {preflight.warning}
            </p>
          )}
          <SystemUnderstandingResult
            record={record}
            input={content}
            emptySections={missingSections}
            previousCount={analysis.historyCount - 1}
          />
          <p className="text-caption text-fg-muted">
            This result is stored in your browser with the project and is never
            written back into System Information. Re-running adds a new record
            and keeps this one.
          </p>
        </motion.div>
      ) : (
        !showRunning &&
        !showBlocked && (
          <Card>
            <EmptyState
              icon={<Bot size={22} aria-hidden />}
              title="No analysis yet"
              description="Analyze System sends your recorded input to the backend, which asks the configured model and validates the answer before it appears here."
              action={
                <Button
                  leftIcon={<Bot size={16} aria-hidden />}
                  onClick={handleAnalyze}
                  disabled={running}
                >
                  Analyze System
                </Button>
              }
            />
          </Card>
        )
      )}
    </>
  );
}

function BackLink({ projectId, name }: { projectId?: string; name?: string }) {
  return (
    <Link
      to={projectId ? projectPath(projectId) : "/projects"}
      className="mb-4 inline-flex items-center gap-1.5 rounded-sm text-small font-medium text-fg-secondary hover:text-fg"
    >
      <ArrowLeft size={15} aria-hidden />
      {name ? `Back to ${name}` : "Back to project"}
    </Link>
  );
}
