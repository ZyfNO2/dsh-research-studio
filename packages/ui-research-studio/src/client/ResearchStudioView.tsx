/** Host-backed Phase-2 Research Studio presentation. */

import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import type { ResearchStudioSnapshot } from '@deepseek-ai/dsh-research-studio/types'
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { ResearchStudioLocaleKey } from './locales.ts'
import css from './ResearchStudioView.module.css'

type ResearchBrief = NonNullable<ResearchStudioSnapshot['brief']>['value']
type ResearchBriefPatch = Partial<ResearchBrief>
type GateStatus = NonNullable<ResearchStudioSnapshot['gate']>['status']

/** One typed result returned by the generated Research Studio Remote. */
export type ResearchStudioRemoteResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: { readonly code: string; readonly message: string } }

/** Deterministic Tutor review that must be confirmed before a Brief mutation. */
export interface ResearchStudioTutorSuggestion {
  readonly id: string
  readonly questions: readonly string[]
  readonly proposedPatch: ResearchBriefPatch
}

/** Registration-side Remote calls used by the view. */
export interface ResearchStudioViewInjected {
  /** Read the current Host-owned Research Studio projection. */
  snapshot: () => Promise<ResearchStudioSnapshot>
  /** Create a project and return its authoritative projection. */
  createProject: (
    request: { readonly title: string; readonly workflowPresetId: string },
  ) => Promise<ResearchStudioRemoteResult<ResearchStudioSnapshot>>
  /** Select a project and return its authoritative projection. */
  selectProject: (request: { readonly projectId: string }) => Promise<ResearchStudioRemoteResult<ResearchStudioSnapshot>>
  /** Rename a project and return its authoritative projection. */
  renameProject: (
    request: { readonly projectId: string; readonly title: string },
  ) => Promise<ResearchStudioRemoteResult<ResearchStudioSnapshot>>
  /** Archive a project and return its authoritative projection. */
  archiveProject: (request: { readonly projectId: string }) => Promise<ResearchStudioRemoteResult<ResearchStudioSnapshot>>
  /** Save one Brief revision and return its authoritative projection. */
  updateBrief: (
    request: {
      readonly projectId: string
      readonly expectedBriefArtifactId: string | null
      readonly brief: ResearchBriefPatch
    },
  ) => Promise<ResearchStudioRemoteResult<ResearchStudioSnapshot>>
  /** Evaluate the current saved Brief and return its authoritative projection. */
  evaluateBriefReady: (
    request: { readonly projectId: string; readonly expectedBriefArtifactId: string },
  ) => Promise<ResearchStudioRemoteResult<ResearchStudioSnapshot>>
  /** Produce a deterministic review without mutating the Host projection. */
  suggestBriefTutor: (
    request: { readonly projectId: string; readonly expectedBriefArtifactId: string | null },
  ) => Promise<ResearchStudioRemoteResult<ResearchStudioTutorSuggestion>>
}

/** Full component props assembled by the conversation view renderer. */
export type ResearchStudioViewProps =
  ConvViewProps
  & PropsLocale<'researchStudio'>
  & InjectFace<ResearchStudioViewInjected>

type ViewState =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly error: string }
  | { readonly status: 'ready'; readonly snapshot: ResearchStudioSnapshot }

const EMPTY_BRIEF: ResearchBrief = {
  problemDomain: '', researchGoal: '', constraints: [], timeline: '', availableData: '',
  availableCode: '', compute: '', currentFoundation: '', initialDirection: '', unknowns: [],
}

const FORM_FIELDS = [
  'problemDomain', 'researchGoal', 'timeline', 'availableData', 'availableCode', 'compute',
  'currentFoundation', 'initialDirection',
] as const

const LIST_FIELDS = ['constraints', 'unknowns'] as const

/** Render project operations, Research Brief authoring, Gate state, and unlocked stages. */
export function ResearchStudioView({
  snapshot, createProject, selectProject, renameProject, archiveProject, updateBrief,
  evaluateBriefReady, suggestBriefTutor, t,
}: ResearchStudioViewProps): ReactNode {
  const [request, setRequest] = useState(0)
  const [state, setState] = useState<ViewState>({ status: 'loading' })
  const [projectTitle, setProjectTitle] = useState('')
  const [renameTitle, setRenameTitle] = useState('')
  const [brief, setBrief] = useState<ResearchBrief>(EMPTY_BRIEF)
  const [selectedStage, setSelectedStage] = useState('research-brief')
  const [tutor, setTutor] = useState<ResearchStudioTutorSuggestion | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let current = true
    void snapshot().then(
      (value) => { if (current) setState({ status: 'ready', snapshot: value }) },
      (error: unknown) => { if (current) setState({ status: 'error', error: messageOf(error) }) },
    )
    return () => { current = false }
  }, [request, snapshot])

  useEffect(() => {
    if (state.status !== 'ready') return
    setRenameTitle(state.snapshot.project?.title ?? '')
    setBrief(state.snapshot.brief?.value ?? EMPTY_BRIEF)
    setTutor(null)
    const selectedStillUnlocked = state.snapshot.unlockedStageIds.some(id => id === selectedStage)
    if (!selectedStillUnlocked) setSelectedStage(String(state.snapshot.unlockedStageIds[0] ?? 'research-brief'))
  }, [state])

  const reload = () => { setState({ status: 'loading' }); setRequest(value => value + 1) }
  const accept = (result: ResearchStudioRemoteResult<ResearchStudioSnapshot>): boolean => {
    if (result.ok) {
      setState({ status: 'ready', snapshot: result.value })
      return true
    }
    setState({ status: 'error', error: result.error.message })
    return false
  }
  const invoke = async (operation: () => Promise<ResearchStudioRemoteResult<ResearchStudioSnapshot>>): Promise<void> => {
    if (pending) return
    setPending(true)
    try {
      accept(await operation())
    } catch (error) {
      setState({ status: 'error', error: messageOf(error) })
    } finally {
      setPending(false)
    }
  }

  if (state.status === 'loading') return <div className={css.status} aria-busy="true">{t('loading')}</div>
  if (state.status === 'error') {
    return <div className={css.status} role="alert"><p>{state.error || t('error')}</p><button type="button" onClick={reload}>{t('retry')}</button></div>
  }

  const data = state.snapshot
  const project = data.project
  const selected = data.stages.find(stage => String(stage.id) === selectedStage) ?? data.stages[0]
  const briefArtifactId = data.brief?.artifact.id === undefined ? null : String(data.brief.artifact.id)
  const gateStatus = data.gate?.status
  const saveBrief = async (event: FormEvent, patch: ResearchBriefPatch = brief): Promise<void> => {
    event.preventDefault()
    if (project === null) return
    await invoke(() => updateBrief({ projectId: String(project.id), expectedBriefArtifactId: briefArtifactId, brief: patch }))
  }
  const confirmTutor = async (): Promise<void> => {
    if (project === null || tutor === null) return
    const merged = { ...brief, ...tutor.proposedPatch }
    setBrief(merged)
    await invoke(() => updateBrief({ projectId: String(project.id), expectedBriefArtifactId: briefArtifactId, brief: merged }))
  }

  return (
    <main className={css.root} data-runtime={data.runtime} aria-busy={pending}>
      <header className={css.header}>
        <div><span className={css.eyebrow}>{t('eyebrow')}</span><h1>{t('title')}</h1><p>{project?.title ?? t('noProject')}</p></div>
        <div className={css.badges} aria-label={t('hostRuntime')}><span>{t('hostRuntime')}</span>{project?.origin === 'seed' && <span className={css.seed}>{t('seedData')}</span>}</div>
      </header>

      <section className={css.projectPanel} aria-label={t('projectActions')}>
        <label>{t('switchProject')}<select disabled={pending} value={project?.id ?? ''} onChange={(event) => { void invoke(() => selectProject({ projectId: event.target.value })) }}><option value="" disabled>{t('noProject')}</option>{data.projects.filter(item => item.archivedAt === undefined).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <form onSubmit={(event) => { event.preventDefault(); void invoke(() => createProject({ title: projectTitle, workflowPresetId: data.preset.id })) }}><label>{t('projectTitle')}<input disabled={pending} value={projectTitle} onChange={(event) => { setProjectTitle(event.target.value) }} placeholder={t('projectNamePlaceholder')} /></label><button type="submit" disabled={pending || projectTitle.trim().length === 0}>{t('createProject')}</button></form>
        {project !== null && <form onSubmit={(event) => { event.preventDefault(); void invoke(() => renameProject({ projectId: String(project.id), title: renameTitle })) }}><label>{t('projectTitle')}<input disabled={pending} value={renameTitle} onChange={(event) => { setRenameTitle(event.target.value) }} /></label><button type="submit" disabled={pending || renameTitle.trim().length === 0}>{t('renameProject')}</button><button type="button" disabled={pending} onClick={() => { void invoke(() => archiveProject({ projectId: String(project.id) })) }}>{t('archiveProject')}</button></form>}
      </section>

      <section className={css.workspace}>
        <nav className={css.stages} aria-label={t('stageRegistry')}><span className={css.sectionLabel}>{t('stageRegistry')}</span>{data.stages.map((stage) => {
          const unlocked = data.unlockedStageIds.some(id => id === stage.id)
          const active = String(stage.id) === String(selected?.id)
          return <button className={active ? css.stageActive : css.stage} key={stage.id} type="button" aria-current={active ? 'step' : undefined} disabled={!unlocked} onClick={() => { setSelectedStage(stage.id) }}><span>{String(stage.order).padStart(2, '0')}</span>{stageTitle(stage.id, stage.title, t)}<small>{unlocked ? t('unlocked') : t('locked')}</small></button>
        })}</nav>

        <article className={css.canvas}>
          {String(selected?.id) === 'research-brief' ? project === null ? <p className={css.placeholder}>{t('noBrief')}</p> : <>
            <span className={css.sectionLabel}>{t('researchBrief')}</span><h2>{t('researchBrief')}</h2>
            <form className={css.briefForm} onSubmit={(event) => { void saveBrief(event) }} aria-label={t('briefFields')}>
              {FORM_FIELDS.map(field => <label key={field}>{t(field)}<textarea value={brief[field]} onChange={(event) => { setBrief(value => ({ ...value, [field]: event.target.value })) }} placeholder={t('fieldPlaceholder')} /></label>)}
              {LIST_FIELDS.map(field => <label key={field}>{t(field)}<textarea value={brief[field].join('\n')} onChange={(event) => { setBrief(value => ({ ...value, [field]: lines(event.target.value) })) }} placeholder={t('fieldPlaceholder')} /></label>)}
              <button type="submit" disabled={pending}>{t('saveBrief')}</button>
            </form>
            <section className={css.statusPanel} aria-label={t('revisionHistory')}><h3>{t('revisionHistory')}</h3><p>{briefArtifactId === null ? t('noRevision') : `${t('revision')} ${data.brief?.artifact.revision ?? 1}`}</p><ol>{data.briefHistory.map(item => <li key={item.id}>{t('revisionPrefix')} {item.revision ?? 1}</li>)}</ol></section>
            <section className={css.statusPanel} aria-label={t('gateStatus')}><h3>{t('gateStatus')}</h3><p>{gateStatus === undefined ? t('gateNotRun') : t(gateKey(gateStatus))}</p>{data.gate !== null && data.gate.missing.length > 0 && <p>{t('missing')}: {data.gate.missing.map(field => t(briefFieldKey(field))).join(', ')}</p>}<button type="button" disabled={pending || briefArtifactId === null} onClick={() => { if (briefArtifactId !== null) void invoke(() => evaluateBriefReady({ projectId: String(project.id), expectedBriefArtifactId: briefArtifactId })) }}>{t('evaluateGate')}</button></section>
            <section className={css.statusPanel} aria-label={t('tutor')}><h3>{t('tutor')}</h3><button type="button" disabled={pending} onClick={() => { if (pending) return; setPending(true); void (async () => { try { const result = await suggestBriefTutor({ projectId: String(project.id), expectedBriefArtifactId: briefArtifactId }); if (result.ok) setTutor(result.value); else setState({ status: 'error', error: result.error.message }) } catch (error) { setState({ status: 'error', error: messageOf(error) }) } finally { setPending(false) } })() }}>{t('requestTutor')}</button>{tutor !== null && <div><h4>{t('tutorQuestions')}</h4><ul>{tutor.questions.map(question => <li key={question}>{t(tutorQuestionKey(question))}</li>)}</ul>{Object.keys(tutor.proposedPatch).length === 0 ? <p>{t('noTutorPatch')}</p> : <><h4>{t('tutorProposal')}</h4><p>{t('tutorProposalFields')}</p><ul>{Object.keys(tutor.proposedPatch).map(field => <li key={field}>{t(briefFieldKey(field))}</li>)}</ul><button type="button" disabled={pending} onClick={() => { void confirmTutor() }}>{t('confirmTutorProposal')}</button></>}</div>}</section>
          </> : <><span className={css.sectionLabel}>{selected === undefined ? '' : stageTitle(selected.id, selected.title, t)}</span><h2>{selected === undefined ? '' : stageTitle(selected.id, selected.title, t)}</h2><p className={css.placeholder}>{selected?.id === 'evidence' ? t('evidenceReady') : t('emptyEntities')}</p></>}
        </article>
      </section>
    </main>
  )
}

function lines(value: string): readonly string[] {
  return value.split('\n').map(item => item.trim()).filter(Boolean)
}

function gateKey(status: GateStatus): 'gatePass' | 'gateWarnings' | 'gateFail' | 'gateBlocked' {
  if (status === 'pass') return 'gatePass'
  if (status === 'pass-with-warnings') return 'gateWarnings'
  if (status === 'blocked') return 'gateBlocked'
  return 'gateFail'
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function tutorQuestionKey(question: string): ResearchStudioLocaleKey {
  const keys: Record<string, ResearchStudioLocaleKey> = {
    'tutor.question.problemDomain': 'tutorQuestionProblemDomain',
    'tutor.question.researchGoal': 'tutorQuestionResearchGoal',
    'tutor.question.constraints': 'tutorQuestionConstraints',
    'tutor.question.timeline': 'tutorQuestionTimeline',
    'tutor.question.availableData': 'tutorQuestionAvailableData',
    'tutor.question.availableCode': 'tutorQuestionAvailableCode',
    'tutor.question.compute': 'tutorQuestionCompute',
    'tutor.question.currentFoundation': 'tutorQuestionCurrentFoundation',
    'tutor.question.initialDirection': 'tutorQuestionInitialDirection',
    'tutor.question.unknowns': 'tutorQuestionUnknowns',
    'tutor.question.refine': 'tutorQuestionRefine',
  }
  return keys[question] ?? 'tutorQuestionRefine'
}

function briefFieldKey(field: string): ResearchStudioLocaleKey {
  const keys: Record<string, ResearchStudioLocaleKey> = {
    problemDomain: 'problemDomain',
    researchGoal: 'researchGoal',
    constraints: 'constraints',
    timeline: 'timeline',
    availableData: 'availableData',
    availableCode: 'availableCode',
    compute: 'compute',
    currentFoundation: 'currentFoundation',
    initialDirection: 'initialDirection',
    unknowns: 'unknowns',
  }
  return keys[field] ?? 'unknowns'
}

function stageTitle(
  stageId: string,
  fallback: string,
  t: (key: ResearchStudioLocaleKey) => string,
): string {
  const keys: Record<string, ResearchStudioLocaleKey> = {
    'research-brief': 'stageResearchBrief',
    evidence: 'stageEvidence',
    'research-design': 'stageResearchDesign',
    'build-spec': 'stageBuildSpec',
    experiment: 'stageExperiments',
    'paper-audit': 'stagePaper',
  }
  const key = keys[stageId]
  return key === undefined ? fallback : t(key)
}

/** Locale keys consumed by ResearchStudioView. */
export type { ResearchStudioLocaleKey }
