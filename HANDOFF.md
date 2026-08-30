# Academic Research Studio / Academic Tailor — Execution Contract & Handoff

## 1. Executive Summary & Repository Model

- **Repository Model**:
  - **Product Repository** (`F:\RStudio\dsh-research-studio`): Authoritative source of Research Studio plugin suite code. All commits, pull requests, and feature development happen exclusively here.
  - **DSH Integration Target** (`F:\RStudio\deepseek-harness`): External host and test harness environment used for plugin mounting, integration testing, and browser E2E. It is **NOT** part of this repository; Research Studio development must never commit unrelated DSH changes.
- **Standalone Repository Baseline**: `fad078d` (`build(research-studio): close companion DSH development loop`)
- **Default Branch**: `main` (Development Integration Branch: `main`; no `master` branch is maintained).
- **Remote Repository**: `https://github.com/ZyfNO2/dsh-research-studio.git`
- **Host Compatibility Baseline**:
  - Tested Upstream DSH Baseline: `cd5ef8148158c3a752a658978873241fdf8e2bbc` (DSH `0.1.2-alpha.1`)
  - Node Version: `^22.19 || >=24`
  - Package Manager: `pnpm 11.22.0`
- **Current Product State**: P3-0 compatibility/build closure is **COMPLETE**. Product packages remain standalone; the sibling DSH checkout resolves private workspace dependencies during development.

---

## 2. Phase Map & Current Checkpoint

The overarching product specification is governed by `docs/Academic_Tailor_Research_Studio_RPD_FINAL_v1.0.md`. The engineering roadmap is phased as follows:

| Phase | Milestone Name | Status | Development Focus |
|---|---|---|---|
| **Phase 0** | RPD / Prototype / Architecture | ✅ COMPLETE | Product requirements, standalone HTML prototype, DSH extension point mapping. |
| **Phase 1** | Plugin Architecture & Executable Skeleton | ✅ COMPLETE | Domain contracts, storage adapter, Host service, snapshot Remote, Web UI view, profile bundle. |
| **Phase 2** | **Research Brief Usable Vertical Slice** | ✅ **COMPLETE** | **Project lifecycle, Application layer, versioned Artifacts, Gate engine, Stage-0 Skill bridge, Tutor dialog.** |
| **Phase 3** | **Evidence & Research Design Core** | 🟡 **P3-0 COMPLETE; P3-A NEXT** | **Companion build closure and external Remote bridge complete; Evidence cards follow.** |
| **Phase 4** | BuildSpec, Coding Agent & Experiment Loop | ⚪ PLANNED | Repo inspection, BuildSpec blueprints, DSH coding agent dispatch, Experiment ledger, Backflow. |
| **Phase 5** | Paper Generation, Claim Trace & Research Audit | ⚪ PLANNED | Claim-to-Evidence trace, multi-perspective reviewer simulation, paper drafting, scientific audit. |
| **Phase 6** | Autonomous Research, Tree Search & Multi-Agent | ⚪ PLANNED | Multi-branch exploration, autonomous research teams, persistent memory, custom presets. |

---

## 3. Current Checkpoint: P3-0 Compatibility & Build Closure

The Phase 3 specification is [docs/Phase_3_Evidence_and_Research_Design_Spec.md](docs/Phase_3_Evidence_and_Research_Design_Spec.md). P3-0 is complete: `pnpm run build`, `pnpm run typecheck`, and `pnpm run test` pass in this repository with the companion checkout present.

The explicit `src/integration/remote-contract.ts` bridge is intentional. DSH's Typert generator currently only recognizes protocol declarations from its own workspace, so an external companion package cannot generate its Remote artifacts. The bridge uses public `TypertRemoteContribution` contracts and the documented Host SRC dispatch path; do not copy or modify DSH Core to evade this boundary.

---

## 4. Architecture Guardrails (Hard Invariants)

The following rules are strict, non-negotiable constraints:

1. **External Host Boundary**: The DeepSeek Harness checkout is an external integration target. Research Studio functionality must be implemented entirely within this standalone repository. Changes inside the DSH checkout are allowed only for temporary local test fixture mounting and must never be committed as product code. When encountering an integration issue: **adapt the plugin to DSH, never mutate DSH to fit the plugin**.
2. **Research Stage ≠ DSH Agent Loop Phase**: Research Stages (Brief, Evidence, Design, BuildSpec, Experiment, Paper) represent scientific progress and must never be conflated with LLM execution loop phases.
3. **Orthogonal Concept Separation**: `Stage`, `Skill`, `Agent`, `Tool`, and `Gate` are distinct domain concepts with independent lifecycles.
4. **Domain Purity**: Domain contracts (`packages/research-studio/src/domain/`) must remain pure TypeScript with zero dependencies on Cordis, DSH internals, React, or browser APIs.
5. **Host Authoritative State**: Authoritative research state lives exclusively on the Host. The Client UI is pure presentation and never acts as a primary state holder.
6. **No Logic Accumulation in Remote Controllers**: Typert Remote controllers must remain thin RPC adapters. Mutation logic belongs in the Application service layer.
7. **Strict Mutation Flow**:
   ```
   Client UI → Remote Controller → Application Service → Domain / ArtifactStore → Storage Adapter
   ```
8. **Presets as Registry Data**: `MVPResearchPreset` remains declarative registry data, not hardcoded execution logic.
9. **Zero Modification to DSH Core**: All capabilities must be introduced via plugins, adapters, and bundles without touching `packages/core/*`.
10. **Locale-Owned Client Copy**: All product-visible UI copy in `@deepseek-ai/dsh-client-ui-research-studio` must use typed locale dictionaries (`locales.ts`) and the `t()` helper.

---

## 5. Phase 2 Verification & Exit Record

All 12 Phase 2 Exit Criteria were verified in the baseline commit:

1. [x] **Project Creation**: Users can create a new Research Project with a title and workflow preset from the Web UI.
2. [x] **Project Persistence**: Projects persist durable state across server restarts via `ctx.storageDomain`.
3. [x] **Project Selection**: Users can switch the active project from the UI, updating the entire studio view.
4. [x] **ResearchBrief Authoring**: Users can view and edit all 10 structured fields of `ResearchBrief` via the Web UI.
5. [x] **Real Storage Path**: `ResearchBrief` updates are saved through the real `ArtifactStore` path.
6. [x] **Versioned Lineage**: Editing produces traceable, versioned `ArtifactRecord` revisions with parent pointers and diffs.
7. [x] **`BRIEF_READY` Gate**: Gate evaluation returns deterministic PASS / FAIL verdicts with actionable reason logs.
8. [x] **Stage Unlocking**: Passing `BRIEF_READY` unlocks Stage 1 (Evidence); new edits safely re-lock it.
9. [x] **Refresh Recovery**: Browser reload restores the active project, Brief head revision, and Gate status without data loss.
10. [x] **Skill Bridge**: Stage-0 research skills (`research-planning`, `problem-formulation`, etc.) are discoverable through `ctx.skills`.
11. [x] **Guided Tutor**: Socratic Tutor inspects gaps, asks stable questions, and saves confirmed patches through the Application layer.
12. [x] **Green Regression**: All unit and integration test suites pass 100%.

---

## 6. Standalone Modification Boundaries & Package Organization

```
packages/research-studio/
├── src/domain/         ← Pure domain contracts, entities, presets, registries. (NO framework dependencies)
├── src/application/    ← Use cases, commands, orchestrators, mutation operations.
├── src/adapter/        ← Cordis Host Service, Storage Domain adapter, Typert Remote Controller.
└��─ tests/              ← Domain unit tests, service tests, and application integration tests.

packages/ui-research-studio/
├── src/client/         ← React presentation components, CSS modules, typed locale dictionaries. Pure props only.
└── tests/              ← Component unit specs using jsdom.

packages/research-studio-bundle/
├── cordis.patch.yml    ← Declarative patch layer mounting Host and Client plugins.
└── src/                ← Bundle metadata and runtime invariants. NO business logic.

docs/                   ← Authoritative Product Requirements Document (RPD v1.0) & HTML Prototype.
.agents/notes/          ← Architectural Decision Records (ADRs) and design rationale.
```

---

## 7. Regression Baseline Structure

The test and verification suites are split into two distinct tiers:

### A. Standalone Plugin Tests (This Repository's CI / PR Suite)
Must be run and pass 100% on every pull request to `dsh-research-studio`:
- **Build**: `pnpm run build` passes for all 3 packages.
- **Typecheck**: `pnpm run typecheck` (`tsc -b`) reports 0 errors.
- **Unit & Component Tests**: `pnpm run test` (Vitest: 6 test files, 13 tests, including `remote-contract.spec.ts`).

### B. DSH Host Integration Tests (In `F:\RStudio\deepseek-harness`)
Used for end-to-end and host compatibility verification:
- **Plugin Mount**: `@deepseek-ai/dsh-research-studio-bundle` mounts cleanly in `dsh --profile web`.
- **Remote RPC**: Client boot graph loads and communicates via `ctx.remote.researchStudio`.
- **Browser E2E**: Headless browser asserts active project, Brief editing, Gate evaluation, and page refresh recovery.
- **Host Regression**: Full DSH suite remains compatible at the verified upstream baseline (`cd5ef814`).

---

## 8. Phase 3 Execution Preview (Next Development Window)

When the Project Owner completes review and authorizes Phase 3, the active workstreams will be:

| ID | Workstream | Status | Dependencies | Scope |
|---|---|---|---|---|
| **P3-01** | Evidence Domain & Storage | 🟡 NEXT | P3-0 | PaperCard, EvidenceCard, RepoReference entities & storage specs. |
| **P3-02** | Literature & Evidence UI | ⚪ PLANNED | P3-01 | Evidence matrix view, paper drawer, bibtex/citation ingestion. |
| **P3-03** | `EVIDENCE_READY` Gate | ⚪ PLANNED | P3-01, P3-02 | Deterministic evaluation of baseline candidates and evidence provenance. |
| **P3-04** | Baseline Studio & Freeze | ⚪ PLANNED | P3-03 | Selecting and locking single reproducible baseline codebase & metrics. |
| **P3-05** | Module Studio & Extract | ⚪ PLANNED | P3-03 | Extracting candidate tailoring modules with explicit interfaces. |
| **P3-06** | Compatibility Matrix | ⚪ PLANNED | P3-04, P3-05 | Tensor shapes, computational cost, and semantic consistency checking. |
| **P3-07** | Falsifiable Hypothesis | ⚪ PLANNED | P3-05, P3-06 | Structured research claim formulation with falsification criteria. |
| **P3-08** | `DESIGN_FROZEN` Gate | ⚪ PLANNED | P3-06, P3-07 | Method freeze gate preparing for Phase 4 BuildSpec generation. |

---

## 9. Mandatory Stop Conditions for Future Phases

Stop development and produce a handoff if:
- The current phase's exit criteria are satisfied;
- Continuing work would enter a future phase not yet authorized;
- A shared domain contract requires a breaking redesign;
- Core Agent Loop modification appears necessary;
- Upstream DSH behavior would have to be altered;
- The storage model would invalidate existing persistence contracts;
- Real external academic API keys or paywalled credentials become mandatory;
- The Skill bridge requires altering DSH's global Skill service lifecycle;
- Implementing components requires introducing non-Cordis orchestration frameworks.
