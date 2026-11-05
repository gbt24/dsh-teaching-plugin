/**
 * Declarative teaching activities and their student-editable state.
 *
 * Every activity is a JSON description, never arbitrary HTML: the Harness UI
 * and the standalone offline export render the same description through their
 * own renderers. Student edits (parameters, code, steps) live in a separate
 * state record tied to the activity revision, so an activity revision change
 * never silently reinterprets older attempts.
 */
import type { ActivityId, ConceptId, CourseId, SessionId } from './ids.ts'
import type { SourceAnchor } from './source.ts'

/** Every supported activity form. */
export type ActivityKind =
  | 'explanation'
  | 'static-figure'
  | 'interactive-graph'
  | 'animation'
  | 'derivation'
  | 'code-run'
  | 'quiz'
  | 'reading-task'
  | 'proof-task'
  | 'open-question'
  | 'experiment-note'
  | 'visual'

/** Safe plot series color token (renderer maps to concrete colors). */
export type PlotColor = 'blue' | 'orange' | 'green' | 'purple' | 'red' | 'gray'

/**
 * One plotted function. `expr` is a restricted arithmetic expression over
 * `x` plus declared parameter names; it is evaluated by the sandboxed
 * expression evaluator, never by `eval`.
 */
export interface PlotSeries {
  readonly id: string
  readonly label: string
  readonly expr: string
  readonly color?: PlotColor
  readonly dashed?: boolean
}

/** A student-adjustable numeric parameter. */
export interface PlotParam {
  readonly name: string
  readonly label: string
  readonly min: number
  readonly max: number
  readonly step: number
  readonly value: number
  /** Unit suffix shown in the label, e.g. "%". */
  readonly unit?: string
}

/** Declarative Cartesian plot. */
export interface GraphPayload {
  readonly type: 'graph'
  readonly title?: string
  readonly xLabel?: string
  readonly yLabel?: string
  readonly xRange: readonly [number, number]
  readonly yRange: readonly [number, number]
  readonly series: readonly PlotSeries[]
  readonly params?: readonly PlotParam[]
  /** Points, dashed guides or labelled regions rendered over the plot. */
  readonly markers?: readonly {
    readonly x: number
    readonly y: number
    readonly label?: string
  }[]
  /** Optional animation over one parameter. */
  readonly animation?: {
    readonly param: string
    readonly from: number
    readonly to: number
    readonly durationMs: number
    readonly loop?: boolean
  }
  /** One-line instruction shown under the plot. */
  readonly hint?: string
}

/** Declarative static figure: renderer-owned diagrams, never raw model SVG. */
export interface FigurePayload {
  readonly type: 'figure'
  readonly title?: string
  readonly variant: 'bar-chart' | 'scatter' | 'concept-map' | 'flow' | 'table'
  /** Bars/scatter points. */
  readonly data?: readonly {
    readonly label: string
    readonly x?: number
    readonly y: number
    readonly group?: string
  }[]
  /** Concept-map / flow nodes and edges. */
  readonly nodes?: readonly { readonly id: string; readonly label: string; readonly detail?: string }[]
  readonly edges?: readonly { readonly from: string; readonly to: string; readonly label?: string }[]
  readonly caption?: string
  readonly alt?: string
}

/** One derivation step, revealed progressively. */
export interface DerivationStep {
  readonly id: string
  /** LaTeX source for display math. */
  readonly latex: string
  /** Short justification shown beside the step. */
  readonly note?: string
  /** Ids of earlier steps this relies on. */
  readonly dependsOn?: readonly string[]
  /** Optional course anchor for the rule applied. */
  readonly anchor?: SourceAnchor
}

/** Structured explanation sections (used for the persistent teaching area). */
export interface ExplanationPayload {
  readonly type: 'explanation'
  readonly title?: string
  readonly markdown: string
  readonly keyPoints?: readonly string[]
  readonly caveats?: readonly string[]
}

/** Objective code test. */
export type CodeTest =
  | { readonly name: string; readonly type: 'stdout-contains'; readonly value: string }
  | { readonly name: string; readonly type: 'stdout-equals'; readonly value: string }
  | { readonly name: string; readonly type: 'exit-code'; readonly value: number }

/** Declarative code experiment. */
export interface CodeRunPayload {
  readonly type: 'code-run'
  readonly title?: string
  /** Runner language id; first version ships python, javascript, scheme. */
  readonly language: string
  /** Dialect hint for scheme runs, e.g. 'sicp'. */
  readonly dialect?: string
  readonly code: string
  readonly editable: boolean
  /** Optional starter code shown when the student resets. */
  readonly starterCode?: string
  readonly instructions?: string
  /** Standard input passed to the runner. */
  readonly stdin?: string
  /** Objective checks; empty means the activity is exploratory. */
  readonly tests?: readonly CodeTest[]
  /** Teaching library/prelude expected by the snippets. */
  readonly requires?: readonly string[]
}

/** Single-choice or multiple-choice question. */
export interface QuizPayload {
  readonly type: 'quiz'
  readonly question: string
  readonly markdown?: string
  readonly options: readonly { readonly id: string; readonly label: string }[]
  /** Correct option ids; the UI hides them until an answer is submitted or requested. */
  readonly correctOptionIds: readonly string[]
  readonly multiple?: boolean
  readonly explanation?: string
  readonly hint?: string
}

/** Reading task pointing into course material. */
export interface ReadingTaskPayload {
  readonly type: 'reading-task'
  readonly instructions: string
  readonly anchors: readonly SourceAnchor[]
  readonly questions: readonly string[]
  readonly minMinutes?: number
}

/** Rubric criterion used for proof/open assessment. */
export interface RubricCriterion {
  readonly id: string
  readonly label: string
  readonly description?: string
  readonly weight: number
  /** What evidence would satisfy it. */
  readonly observable?: string
}

/** Proof task assessed against a rubric by the model, with stated caveats. */
export interface ProofTaskPayload {
  readonly type: 'proof-task'
  readonly claim: string
  readonly assumptions: readonly string[]
  readonly rubric: readonly RubricCriterion[]
  readonly hint?: string
  readonly reference?: string
}

/** Open-ended question assessed against a rubric. */
export interface OpenQuestionPayload {
  readonly type: 'open-question'
  readonly prompt: string
  readonly rubric: readonly RubricCriterion[]
  readonly referencePoints?: readonly string[]
  readonly expectedLanguage?: 'zh' | 'en' | 'bilingual'
}

/** Note recording an experiment carried out with an environment. */
export interface ExperimentNotePayload {
  readonly type: 'experiment-note'
  readonly title: string
  readonly markdown: string
  readonly runId?: string
  readonly environmentId?: string
  readonly limitations?: readonly string[]
}

/** Renderer used by a visual activity. `mermaid` source is stored even when a client cannot render it yet. */
export type VisualRenderer = 'svg' | 'html' | 'mermaid'

/** Pedagogical shape of a visual (subject-agnostic; used for labels and carrier choice). */
export type VisualType =
  | 'diagram'
  | 'flow'
  | 'timeline'
  | 'tree'
  | 'map'
  | 'chart'
  | 'animation'
  | 'interactive'
  | 'other'

/**
 * A self-contained visual teaching activity (HTML/SVG/Mermaid source).
 *
 * The source is untrusted model output: clients must render it inside a
 * sandboxed iframe (no same-origin, no network) rather than injecting it into
 * the plugin DOM. `formula`/`conditions` are optional so the same payload works
 * for non-mathematical subjects.
 */
export interface VisualPayload {
  readonly type: 'visual'
  readonly renderer: VisualRenderer
  /** Self-contained source: SVG markup, HTML fragment, or Mermaid source. */
  readonly source: string
  readonly title?: string
  readonly visualType?: VisualType
  /** One-sentence takeaway shown next to the visual. */
  readonly caption?: string
  /** "注意看……" observation prompt. */
  readonly observe?: string
  /** Optional LaTeX formula rendered by KaTeX outside the iframe. */
  readonly formula?: string
  /** Applicability conditions, boundaries or counterexamples. */
  readonly conditions?: readonly string[]
  /** Whether the HTML source expects scripts (sandbox policy differs). */
  readonly interactive?: boolean
  /** Suggested height in CSS pixels. */
  readonly height?: number
  /** Plain-text fallback when the renderer cannot display the visual. */
  readonly fallbackText?: string
  /** Accessible description. */
  readonly alt?: string
}

/** Discriminated union of every activity payload. */
export type ActivityPayload =
  | ExplanationPayload
  | FigurePayload
  | GraphPayload
  | DerivationPayload
  | CodeRunPayload
  | QuizPayload
  | ReadingTaskPayload
  | ProofTaskPayload
  | OpenQuestionPayload
  | ExperimentNotePayload
  | VisualPayload

/** Derivation activity wrapper. */
export interface DerivationPayload {
  readonly type: 'derivation'
  readonly title?: string
  readonly claim?: string
  readonly steps: readonly DerivationStep[]
  readonly conclusion?: string
}

/** How the activity's outcome can be checked. */
export interface ActivityVerification {
  readonly kind: 'none' | 'objective' | 'rubric' | 'open'
  /** Short explanation of the check, shown to the student. */
  readonly note?: string
}

/** Metadata shared by every activity. */
export interface ActivityBase {
  readonly id: ActivityId
  readonly kind: ActivityKind
  readonly sessionId: SessionId
  readonly courseId: CourseId
  readonly conceptIds: readonly ConceptId[]
  readonly goal: string
  readonly title: string
  readonly createdAt: string
  readonly updatedAt: string
  /** Monotonic revision; student edits create a new revision. */
  readonly revision: number
  readonly status: 'active' | 'archived'
  readonly sourceRefs: readonly SourceAnchor[]
  readonly verification: ActivityVerification
  /** Whether the activity is meant to be solved independently (affects mastery). */
  readonly independent?: boolean
}

/** Full activity record: metadata plus the current revision payload. */
export interface LessonActivity extends ActivityBase {
  readonly payload: ActivityPayload
  /** Prior revisions are kept for attempt-to-revision traceability. */
  readonly revisionHistory?: readonly {
    readonly revision: number
    readonly createdAt: string
    readonly payload: ActivityPayload
    readonly createdBy: 'teacher' | 'student' | 'system'
    readonly note?: string
  }[]
}

/** Student-editable state of one activity, bound to a specific revision. */
export interface ActivityState {
  readonly activityId: ActivityId
  readonly activityRevision: number
  /** Parameter values overrides for graph activities. */
  readonly params?: Readonly<Record<string, number>>
  /** Current code for code activities. */
  readonly code?: string
  /** Which derivation steps are revealed. */
  readonly revealedStepIds?: readonly string[]
  /** Free-form student notes attached to the activity. */
  readonly notes?: string
  readonly updatedAt: string
}

/** Persisted objective/reference verification result. */
export interface ActivityResult {
  readonly activityId: ActivityId
  readonly activityRevision: number
  readonly kind: 'objective' | 'exploratory' | 'rubric' | 'open'
  readonly passed?: boolean
  readonly tests?: readonly { readonly name: string; readonly status: 'pass' | 'fail' | 'not-run'; readonly detail?: string }[]
  readonly output?: string
  readonly durationMs?: number
  readonly notes?: readonly string[]
  readonly createdAt: string
}
