// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ResearchStudioSnapshot } from '@deepseek-ai/dsh-research-studio/types'
import {
  ResearchStudioView,
  type ResearchStudioViewInjected,
  type ResearchStudioViewProps,
} from '../src/client/ResearchStudioView.tsx'
import { en } from '../src/client/locales.ts'

const snapshot = {
  runtime: 'host',
  projects: [
    { id: 'project-a', title: 'Project A', workflowPresetId: 'mvp-research', origin: 'user', createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z', currentStageId: 'research-brief' },
    { id: 'project-b', title: 'Project B', workflowPresetId: 'mvp-research', origin: 'user', createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z', currentStageId: 'research-brief' },
  ],
  project: { id: 'project-a', title: 'Project A', workflowPresetId: 'mvp-research', origin: 'user', createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z', currentStageId: 'research-brief' },
  preset: { id: 'mvp-research', version: '1.0.0', title: 'MVP Research Preset', stageIds: ['research-brief', 'evidence'] },
  stages: [
    { id: 'research-brief', version: '1.0.0', title: 'Research Brief', order: 1, objectTypes: [], skillIds: [], tools: [], gateIds: ['BRIEF_READY'] },
    { id: 'evidence', version: '1.0.0', title: 'Evidence', order: 2, objectTypes: [], skillIds: [], tools: [], gateIds: [] },
  ],
  entities: [],
  brief: {
    artifact: { id: 'brief-a', projectId: 'project-a', type: 'research-brief', version: '1.0.0', origin: 'user', content: {}, revision: 1, updatedAt: '2026-08-30T00:00:00.000Z' },
    value: { problemDomain: 'Retrieval', researchGoal: 'Improve recall', constraints: ['No private data'], timeline: 'One month', availableData: 'Public corpus', availableCode: 'Baseline', compute: 'One GPU', currentFoundation: 'Retriever', initialDirection: 'Rerank', unknowns: ['Latency'] },
  },
  briefHistory: [{ id: 'brief-a', projectId: 'project-a', type: 'research-brief', version: '1.0.0', origin: 'user', content: {}, revision: 1, updatedAt: '2026-08-30T00:00:00.000Z' }],
  gate: null,
  unlockedStageIds: ['research-brief'],
} as unknown as ResearchStudioSnapshot

function success<T>(value: T) { return Promise.resolve({ ok: true as const, value }) }

function props(overrides: Partial<ResearchStudioViewInjected> = {}): ResearchStudioViewProps {
  const injected: ResearchStudioViewInjected = {
    snapshot: async () => snapshot,
    createProject: vi.fn(() => success(snapshot)),
    selectProject: vi.fn(() => success(snapshot)),
    renameProject: vi.fn(() => success(snapshot)),
    archiveProject: vi.fn(() => success(snapshot)),
    updateBrief: vi.fn(() => success(snapshot)),
    evaluateBriefReady: vi.fn(() => success(snapshot)),
    suggestBriefTutor: vi.fn(() => success({ id: 'tutor-a', questions: ['tutor.question.compute'], proposedPatch: { unknowns: ['Latency', '[unknown:compute]'] } })),
    evaluateEvidenceReady: vi.fn(() => success(snapshot)),
    savePaperCard: vi.fn(() => success(snapshot)),
    saveEvidenceCard: vi.fn(() => success(snapshot)),
    saveBaselineCard: vi.fn(() => success(snapshot)),
    freezeBaseline: vi.fn(() => success(snapshot)),
    saveModuleCard: vi.fn(() => success(snapshot)),
    saveCompatibility: vi.fn(() => success(snapshot)),
    saveClaimDraft: vi.fn(() => success(snapshot)),
    freezeDesign: vi.fn(() => success(snapshot)),
    ...overrides,
  }
  return {
    ...injected,
    t: (key: keyof typeof en) => en[key],
    viewRequest: null,
    openView: () => {},
    completeViewRequest: () => {},
  } as unknown as ResearchStudioViewProps
}

describe('ResearchStudioView', () => {
  afterEach(() => { cleanup() })

  it('creates and switches projects, saves a Brief, evaluates its Gate, and confirms a Tutor proposal', async () => {
    const createProject = vi.fn<ResearchStudioViewInjected['createProject']>(() => success(snapshot))
    const selectProject = vi.fn<ResearchStudioViewInjected['selectProject']>(() => success(snapshot))
    const updateBrief = vi.fn<ResearchStudioViewInjected['updateBrief']>(() => success(snapshot))
    const evaluateBriefReady = vi.fn<ResearchStudioViewInjected['evaluateBriefReady']>(() => success(snapshot))
    const view = props({ createProject, selectProject, updateBrief, evaluateBriefReady })
    render(<ResearchStudioView {...view} />)

    await screen.findByRole('heading', { name: 'Research Studio' })
    expect(screen.getByRole('button', { name: /Evidence/ })).toHaveProperty('disabled', true)

    fireEvent.change(screen.getAllByLabelText('Project title')[0]!, { target: { value: 'New study' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create project' }))
    await waitFor(() => { expect(createProject).toHaveBeenCalledWith({ title: 'New study', workflowPresetId: 'mvp-research' }) })

    fireEvent.change(screen.getByLabelText('Switch current project'), { target: { value: 'project-b' } })
    await waitFor(() => { expect(selectProject).toHaveBeenCalledWith({ projectId: 'project-b' }) })

    fireEvent.change(screen.getByLabelText('Problem domain'), { target: { value: 'Updated retrieval' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Brief' }))
    await waitFor(() => { expect(updateBrief).toHaveBeenCalled() })
    const firstUpdate = updateBrief.mock.calls[0]?.[0]
    expect(firstUpdate?.projectId).toBe('project-a')
    expect(firstUpdate?.expectedBriefArtifactId).toBe('brief-a')
    expect(firstUpdate?.brief.problemDomain).toBe('Updated retrieval')

    fireEvent.click(screen.getByRole('button', { name: 'Evaluate Brief' }))
    await waitFor(() => { expect(evaluateBriefReady).toHaveBeenCalledWith({ projectId: 'project-a', expectedBriefArtifactId: 'brief-a' }) })

    fireEvent.click(screen.getByRole('button', { name: 'Get Tutor review' }))
    expect(await screen.findByText('What are the available compute limits?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and save proposal' }))
    await waitFor(() => { expect(updateBrief).toHaveBeenCalledTimes(2) })
    expect(updateBrief.mock.calls[1]?.[0].brief.unknowns).toEqual(['Latency', '[unknown:compute]'])
  })

  it('surfaces a Remote mutation error and offers retry', async () => {
    const renameProject = vi.fn(() => Promise.resolve({ ok: false as const, error: { code: 'denied', message: 'Rename unavailable' } }))
    render(<ResearchStudioView {...props({ renameProject })} />)

    await screen.findByRole('heading', { name: 'Research Studio' })
    fireEvent.click(screen.getByRole('button', { name: 'Rename project' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Rename unavailable')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
  })
})
