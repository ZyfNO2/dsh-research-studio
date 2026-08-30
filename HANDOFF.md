# Academic Research Studio / Academic Tailor — Execution Contract & Handoff

## 1. Executive Summary & Base State

- **Current Base**: Phase 2 — Research Brief Usable Vertical Slice is **COMPLETE**. Development is stopped before Phase 3.
- **Upstream DSH Baseline**: `cd5ef8148158c3a752a658978873241fdf8e2bbc`
- **Research Studio Integration Baseline**: `c86791b57f8f62f3a8b4b1a457ea5941c9b68e99`
- **Phase 2 Starting HEAD**: `f8d9eef2671e4dedf7eb062d1f1dca6a911fdf9d`
- **Default Branch**: `main` (mirrored to `master`)
- **Remote Repository**: `https://github.com/ZyfNO2/dsh-research-studio.git`
- **Current Product State**: Usable Host-authoritative Research Brief workflow. Project lifecycle, immutable Brief revisions, deterministic Gate evaluation, Evidence unlocking, Stage-0 Skill discovery, confirmed Tutor proposals, refresh recovery, and the Web profile path are verified.

---

## 2. Phase Map & Development Target

The overarching product specification is governed by `docs/research-studio/Academic_Tailor_Research_Studio_RPD_FINAL_v1.0.md`. The engineering roadmap is phased as follows:

| Phase | Milestone Name | Status | Development Focus |
|---|---|---|---|
| **Phase 0** | RPD / Prototype / Architecture | ✅ COMPLETE | Product requirements, standalone HTML prototype, DSH extension point mapping. |
| **Phase 1** | Plugin Architecture & Executable Skeleton | ✅ COMPLETE | Domain contracts, storage adapter, Host service, snapshot Remote, Web UI view, profile bundle. |
| **Phase 2** | **Research Brief Usable Vertical Slice** | ✅ **COMPLETE** | **Project lifecycle, Application layer, versioned Artifacts, Gate engine, Stage-0 Skill bridge, Tutor dialog.** |
| **Phase 3** | Evidence & Research Design Core | ⚪ **NEXT PLANNING ENTRY (STOP)** | Literature matrix, Evidence cards, Baseline freeze, Module compatibility, Claim formulation. |
| **Phase 4** | BuildSpec, Coding Agent & Experiment Loop | ⚪ PLANNED | Repo inspection, BuildSpec blueprints, DSH coding agent dispatch, Experiment ledger, Backflow. |
| **Phase 5** | Paper Generation, Claim Trace & Research Audit | ⚪ PLANNED | Claim-to-Evidence trace, multi-perspective reviewer simulation, paper drafting, scientific audit. |
| **Phase 6** | Autonomous Research, Tree Search & Multi-Agent | ⚪ PLANNED | Multi-branch exploration, autonomous research teams, persistent memory, custom presets. |

---

## 3. Execution Boundary (Closed Development Window: Phase 2)

This boundary remains the acceptance record for the completed Phase 2 implementation. It does not authorize Phase 3 development; the next round must plan that phase explicitly.

### 3.1 Goal of This Development Window
Deliver the **Research Brief Usable Vertical Slice** so that a researcher can create a project, author a structured `ResearchBrief`, persist versioned artifacts, run `BRIEF_READY` Gate evaluations, unlock Stage 1, and interact with a guided Socratic Tutor via Stage-0 skill metadata without bypassing the application layer.

### 3.2 In Scope (Developer MAY Implement)
- Project lifecycle: create, open, select, rename, archive, list;
- Active project persistence and auto-recovery across restarts;
- Typert Remote mutation APIs on `ResearchStudioController`;
- Application service layer (`packages/research/research-studio/src/application/`) decoupling business use cases from Remote transport;
- Structured `ResearchBrief` domain artifact;
- Artifact operations: create, update, version, diff, lineage, and lifecycle transitions (`draft`, `candidate`, `accepted`, `rejected`);
- `BRIEF_READY` Gate runtime evaluation returning deterministic verdicts and reason logs;
- Stage transition logic unlocking Stage 1 (Evidence) upon Gate PASS;
- Web UI Research Brief onboarding and structured editor forms;
- Stage-0 Skill bridge connecting domain metadata (`research-planning`, `problem-formulation`, `scope-definition`, `feasibility-check`) to Host `ctx.skills`;
- Minimal Guided Socratic Tutor loop interacting over the Application/Artifact layer;
- Unit, service, and component regression test suites covering all newly added capabilities.

### 3.3 Out of Scope (Do NOT Implement in Phase 2)
- Literature search, paper parsing, or Evidence matrix automated pipelines (Phase 3);
- Research Design workflow, Candidate Idea search, or Baseline selection automation (Phase 3);
- Module tailoring or compatibility matrix reasoning (Phase 3);
- BuildSpec compilation or AST code modification blueprints (Phase 4);
- Coding Agent orchestration or workspace code generation (Phase 4);
- Experiment matrix execution, runner dispatch, or metric logging (Phase 4);
- Paper section drafting, claim auditing, or reviewer simulation (Phase 5);
- Tree Search hypothesis exploration or multi-agent orchestration frameworks (Phase 6);
- Modifying, monkey-patching, or replacing the DSH Core or Main Agent Loop (`packages/core/*`);
- Speculative abstractions or frameworks for future phases not required by Phase 2 contracts.

---

## 4. Architecture Guardrails (Hard Invariants)

The following 10 rules are strictly enforced. No local implementation may violate them:

1. **Research Stage ≠ DSH Agent Loop Phase**: Research Stages (Brief, Evidence, Design, BuildSpec, Experiment, Paper) represent scientific progress and must never be conflated with LLM execution loop phases.
2. **Orthogonal Concept Separation**: `Stage`, `Skill`, `Agent`, `Tool`, and `Gate` are distinct domain concepts with independent lifecycles.
3. **Domain Purity**: Domain contracts (`packages/research/research-studio/src/domain/`) must remain pure TypeScript with zero dependencies on Cordis, DSH internals, React, or browser APIs.
4. **Host Authoritative State**: Authoritative research state lives exclusively on the Host. The Client UI is pure presentation and never acts as a primary state holder.
5. **No Logic Accumulation in Remote Controllers**: Typert Remote controllers must remain thin RPC adapters. Mutation logic belongs in the Application service layer.
6. **Strict Mutation Flow**:
   ```
   Client UI → Remote Controller → Application Service → Domain / ArtifactStore → Storage Adapter
   ```
7. **Presets as Registry Data**: `MVPResearchPreset` remains declarative registry data, not hardcoded execution logic.
8. **Preserve Phase 1 Public Contracts**: Existing domain contracts (`ResearchProject`, `ArtifactRecord`, `StageDefinition`, `WorkflowPreset`) must be preserved unless a Phase 2 requirement proves them insufficient.
9. **Zero Modification to DSH Core**: All capabilities must be introduced via plugins, adapters, and bundles without touching `packages/core/*`.
10. **Locale-Owned Client Copy**: All product-visible UI copy in `@deepseek-ai/dsh-client-ui-research-studio` must use typed locale dictionaries (`locales.ts`) and the `t()` helper.

---

## 5. Phase 2 Active Workstreams & Dependency Topology

```
[P2-01: Project Lifecycle]
        ↓
[P2-02: Application Mutation Layer]
        ↓
[P2-03: Artifact Authoring] ─────→ [P2-04: Research Brief UI]
        ↓                                    ↓
[P2-05: Gate Runtime] ─────────────→ [P2-06: Stage Transition]
        ↑
        │
[P2-07: Skill Bridge]
        ↓
[P2-08: Tutor Runtime]
```

| ID | Workstream | Status | Dependencies | Scope & Deliverables |
|---|---|---|---|---|
| **P2-01** | Project Lifecycle | **COMPLETE** | Phase 1 | Create, open, select, rename, archive, list, and auto-restore active project. |
| **P2-02** | Mutation Application Layer | **COMPLETE** | P2-01 | `src/application/` owns mutation use cases over project and artifact storage interfaces. |
| **P2-03** | Artifact Authoring | **COMPLETE** | P2-01, P2-02 | Brief edits create immutable candidate artifacts with parent lineage and top-level diffs; Gate evaluation appends accepted or rejected lifecycle revisions. |
| **P2-04** | Research Brief UI | **COMPLETE** | P2-02, P2-03 | Web UI edits all ten structured Brief fields and exposes revision history. |
| **P2-05** | Gate Runtime | **COMPLETE** | P2-03 | `BRIEF_READY` produces deterministic verdicts, missing fields, and stable reasons. |
| **P2-06** | Stage Transition | **COMPLETE** | P2-05 | PASS unlocks Evidence; any later Brief revision invalidates the prior verdict and re-locks it. |
| **P2-07** | Skill Bridge | **COMPLETE** | Phase 1 | Four Stage-0 skills register through lifecycle-owned `ctx.skills.register` effects. |
| **P2-08** | Tutor Runtime | **COMPLETE** | P2-03, P2-05, P2-07 | The deterministic Tutor inspects gaps, asks stable questions, and saves only a user-confirmed patch through the Application layer. |

---

## 6. Implementation Freedom vs Reserved Decisions

### 6.1 Implementation Freedom (Developer May Decide Autonomously)
Within the execution boundary, the developer may independently decide:
- Internal class and function decomposition;
- Application service structure and method naming;
- Remote command granularity and payload schemas;
- Input validation and schema checking details;
- UI component hierarchy, layout styling, and CSS modules;
- Local React component state and form handling;
- Error handling, rejection codes, and diagnostic logging;
- Test organization, test fixtures, and mock boundaries;
- Small refactors required to cleanly support Phase 2.

### 6.2 Decisions Reserved for Project Owner (Do NOT Change Without Sign-off)
The developer MUST NOT make unilateral decisions regarding:
- Modifying the 6-stage research progression model;
- Adding, removing, or redefining research stage semantics;
- Changing the definition of Research Artifact states (`draft`, `candidate`, `accepted`, `rejected`);
- Altering the academic tailoring methodology (Baseline → Module → Hypothesis → Experiment);
- Merging or redesigning the Stage / Skill / Agent / Tool boundaries;
- Introducing external orchestration frameworks or state machine libraries;
- Modifying the role or architecture of DSH Core;
- Designing Phase 3 Research Design UX or candidate idea ranking policies;
- Automated paper-writing, experiment dispatch, or novelty scoring policies.

---

## 7. Phase 2 Exit Criteria (Objective Acceptance Checklist)

Phase 2 is complete **only when all 12 of the following criteria are true and verified**:

1. [x] A user can create a new Research Project with a title and workflow preset from the Web UI.
2. [x] The project persists across application/server restarts via `ctx.storageDomain`.
3. [x] A user can switch the active project from the UI, updating the entire studio view.
4. [x] A structured `ResearchBrief` artifact can be created and edited via the Web UI.
5. [x] `ResearchBrief` updates are saved through the real `ArtifactStore` path.
6. [x] Editing produces a traceable, versioned `ArtifactRecord` with lineage.
7. [x] The `BRIEF_READY` Gate can be evaluated and returns deterministic PASS / FAIL verdicts with reasons.
8. [x] A successful `BRIEF_READY` evaluation unlocks Stage 1 (Evidence) in stage navigation.
9. [x] Refreshing the browser restores the active project and `ResearchBrief` without data loss.
10. [x] Stage-0 research skills are discoverable through the explicit Skill bridge on the Host.
11. [x] The Guided Tutor can inspect missing/unknown fields in `ResearchBrief` and propose updates through the Application/Artifact layer.
12. [x] The Phase 1 build, typecheck, focused Vitest, and real Web boot/Remote checks remain green.

The first mandatory stop condition is active: all Phase 2 criteria are satisfied. Do not implement Evidence or Research Design in this development window.

---

## 8. Mandatory Stop Conditions

The developer / coding agent MUST stop development, preserve clean working tree state, and produce a handoff if any of the following occur:

- **All Phase 2 exit criteria are satisfied** (stop and hand over for Phase 3 planning);
- Continuing work would require implementing Phase 3 features (Literature, Evidence, Research Design);
- A shared domain contract requires a breaking redesign across packages;
- Modifying the DSH Core Agent Loop appears necessary to proceed;
- Global upstream DSH behavior would have to be altered;
- The storage model would invalidate Phase 1 persistence contracts;
- Real external academic API keys or paywalled credentials become mandatory;
- The Skill bridge requires altering DSH's global Skill service lifecycle;
- Implementing the Tutor requires introducing a non-Cordis orchestration framework;
- Progress appears to require Tree Search, Multi-Agent swarm, or workflow engine overhauls.

---

## 9. Modification Boundaries & File Organization

```
packages/research/research-studio/
├── src/domain/         ← Pure domain contracts, entities, presets, registries. (NO framework dependencies)
├── src/application/    ← (New in Phase 2) Use cases, commands, orchestrators, mutation operations.
├── src/adapter/        ← Cordis Host Service, Storage Domain adapter, Typert Remote Controller.
└── tests/              ← Domain unit tests, service tests, and application integration tests.

packages/client/ui-research-studio/
├── src/client/         ← React presentation components, CSS modules, typed locale dictionaries. Pure props only.
└── tests/              ← Component unit specs using jsdom.

packages/bundle/research-studio-bundle/
├── cordis.patch.yml    ← Declarative patch layer mounting Host and Client plugins.
└── src/                ← Bundle metadata and runtime invariants. NO business logic.
```

---

## 10. Regression Baseline

The following Phase 1 checks were rerun for the Phase 2 closeout:

1. **Build Gate**: `pnpm run build` passes cleanly across Host, Client, and Web faces.
2. **Typecheck Gate**: `tsc -b tsconfig.client.json` and `tsconfig.host.json` report 0 errors.
3. **Focused Phase 2 Tests**: 4 focused files and 9 tests pass across the Research Studio application, Host service, Client view, and bundle.
4. **Full Phase 1 GUI Regression**: 289 files pass; 3,824 tests pass and 1 is skipped.
5. **Bundle Integration**: `apps/web/tests/research-studio.e2e.ts` mounts `@deepseek-ai/dsh-research-studio-bundle` as a real profile layer and asserts the Research Studio Client entry is in the composed boot graph. A user's bare `dsh --profile web --dump-config` includes the two rows only after that installed profile adds this bundle; closeout did not mutate the user's installed profile.
6. **Web Boot & Remote RPC**: Both real browser tests pass. They load `@deepseek-ai/dsh-client-ui-research-studio/client.js`, call the generated `ctx.remote.researchStudio` mutations, refresh, and restore the active project, Brief head, and Gate PASS.
7. **Static Gates**: Repository lint, exported JSDoc, Client copy ownership, configuration/client/Cordis catalogs, subsystem ownership, translation records for changed bilingual pairs, and `git diff --check` pass.

## 11. Known Limitations and Unverified Checks

- `pnpm run doc-sync` completes 27 of 32 gates. Three remaining gate failures originate in the pre-existing unpaired RPD: its illustrative TypeScript block references undeclared placeholder types, it has no Chinese counterpart, and it contains two hard-wrapped prose regions. This round intentionally did not rewrite the authoritative product RPD.
- The other two documentation failures are environment/tooling-specific: the Client Cordis inspect projector crashes inside TypeScript while following the Phase-1 cross-package Client type export, and the Windows documentation-site negative test cannot create a symbolic link without the required OS privilege.
- The existing Windows `shipped-composition.e2e.ts` expects a `bash` provider even though the Windows composition exposes `pwsh`; it is not evidence against the Research Studio bundle and was not changed in this round.
- The installed user `web` profile was not mutated. Source-composed Loader and browser tests verify this repository's bundle, but a global `dsh --profile web --dump-config` will not show Research Studio until that installed profile explicitly adds the bundle.
- The Guided Tutor is deterministic and does not call an LLM. Evidence is an unlocked placeholder only; literature ingestion, evidence authoring, and Research Design remain absent by design.

## 12. Phase 3 Handoff Entry (Planning Only)

Phase 3 begins from the persisted active project, current accepted Brief artifact, matching `BRIEF_READY` evaluation, and unlocked Evidence stage. Its first planning task is to define Evidence artifacts and Research Design ownership without weakening immutable Brief lineage, stale-write rejection, or the Host-authoritative mutation path.

Phase 3 must not treat the Phase 2 Tutor as an evidence source, reuse research stages as Agent Loop phases, or add literature/search providers before their data ownership, provenance, and acceptance tests are defined. The current Evidence page is deliberately an unlocked placeholder and is the UI entry point for the next design round.
