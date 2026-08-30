# Agent Note: Research Studio uses domain, Host adapter, Client Plugin, and bundle layers

Status: implemented

English | [中文](2026-08-30-research-studio-plugin-layers.zh.md)

## Problem

Academic Research Studio needs durable research projects, extensible registries, and a Web surface without changing the Core Agent Loop or binding its domain model to unstable Harness internals. Its six-stage MVP is a default workflow shape, not a permanent product boundary. Stage, Skill, Agent, Tool, and Gate must remain distinct concepts even when one preset relates them.

## Decision

The implementation uses four explicit layers:

1. `packages/research/research-studio/src/domain` owns framework-independent contracts and registries. `MVPResearchPreset` is ordinary registry input.
2. `src/application` owns project, versioned Brief, deterministic Gate, stage-transition, and Tutor use cases over project and artifact storage interfaces.
3. `src/adapter` owns DSH-specific integration: a Cordis Service, the unchanged storage-domain tables, project and artifact storage adapters, thin Typert Remote commands, and a lifecycle-owned bridge from four Stage-0 skills into `ctx.skills`.
4. `packages/client/ui-research-studio` is a Client Plugin occupying `conversation.view`. It sends mutations through the generated Remote, replaces its projection with the Host response, and keeps only unsaved form and navigation state locally.
5. `packages/bundle/research-studio-bundle` is an installable Web profile patch that composes the Host and Client rows. The existing `api/remotes` assembly mounts the Remote namespace.

Research stages do not reuse DSH Agent Loop phases or the workflow engine. A `StageDefinition` carries separate Skill identifiers, Tool references, and Gate identifiers; it does not turn those concepts into aliases. The domain imports no Cordis or DSH package. Every Brief edit creates an immutable artifact revision, invalidates any Gate verdict for the prior head, and returns the project to the Research Brief stage. Evidence unlocks only when the project stage and a PASS evaluation both reference the current Brief head.

## Alternatives considered

- **Add Research Studio rows and state directly to Core or the Web bundle.** Rejected because removal and independent evolution would require Core edits, and product-specific state would become an app boundary.
- **Model six research stages as DSH workflow phases.** Rejected because research taxonomy and execution lifecycle are different dimensions; doing so would hard-code the MVP and conflate stages with execution.
- **Render the supplied static prototype as the product.** Rejected because it would not prove Host state, Remote transport, Client Plugin loading, or registry-driven UI.
- **Let the Client own mock registry data or optimistic primary state.** Rejected because UI success could then hide a broken Host integration or stale-write rejection. Demo records and mutation results are Host-owned, and seed records explicitly report `origin: seed`.
- **Add a new transaction, workflow, or global Skill-provider framework.** Rejected because Phase 2 needs one application service and four ordinary `ctx.skills.register` effects; extra infrastructure would not improve the current acceptance path.

## Consequences

- The domain remains unit-testable without Harness runtime dependencies and can evolve behind a narrow adapter.
- The Web profile can add or remove Research Studio as a plugin layer; the Agent Loop remains untouched.
- The Phase 2 UI supports project lifecycle, structured Brief authoring, revision history, deterministic Gate evaluation, Evidence unlocking, and confirmed Tutor proposals through the real storage-backed Host Service → Application Service → Typert Remote → Client Plugin path.
- The four Stage-0 skills share the Host plugin lifecycle and are discoverable through the existing Skill registry without changing its global provider lifecycle.
- Evidence collection and Research Design remain absent. Adding their artifacts and views requires a Phase 3 decision rather than extending the Phase 2 Brief flow speculatively.
