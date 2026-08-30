---
description: "Host-side Research Studio project lifecycle, versioned Research Brief artifacts, deterministic Gate evaluation, Stage-0 skills, and Typert Remote commands."
kind: "package-reference"
---

# @deepseek-ai/dsh-research-studio

English | [中文](README.zh.md)

## Summary

`dsh-research-studio` lets a Web profile create and restore research projects, save immutable Research Brief revisions, evaluate `BRIEF_READY`, and unlock Evidence without modifying the Agent Loop. Its framework-independent domain keeps Stage, Skill, Agent, Tool, and Gate concepts separate. The application service owns mutations over project and artifact storage interfaces, while the adapter exposes `ctx.researchStudio`, generated Typert Remote commands, and four Stage-0 skills. The built-in `MVPResearchPreset` remains ordinary registry data.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Mount it after the storage-domain service. `seedDemoProject` is false by default and is intended only for an explicitly marked demo profile.

```yaml
- id: research-studio
  name: '@deepseek-ai/dsh-research-studio'
  config:
    seedDemoProject: false
```

Host consumers read `ctx.researchStudio`; browser consumers use the `researchStudio` Remote assembled by `@deepseek-ai/dsh-api-remotes`. Mutations return the complete Host projection, and stale Brief writes fail when their expected artifact id is not the current head.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

### Separation of concerns

- `src/domain/` has no Cordis, React, browser, or DSH package imports and keeps Stage, Skill, Agent, Tool reference, and Gate concepts distinct.
- `src/application/` owns project lifecycle, Brief revisions and diffs, Gate evaluation, stage transitions, and Tutor proposals over storage interfaces.
- `src/adapter/` owns Cordis lifecycle, the existing storage-domain schema, durable project and artifact adapters, thin Typert commands, and Skill registration effects.
- `MVPResearchPreset` is ordinary registry input, not a fixed workflow enum.

### Source map

| File | Role |
|---|---|
| [`src/domain/types.ts`](src/domain/types.ts) | Domain contracts and branded identifiers |
| [`src/domain/registries.ts`](src/domain/registries.ts) | Entity, workflow, stage, and skill registries |
| [`src/domain/mvp-preset.ts`](src/domain/mvp-preset.ts) | Six-stage MVP preset and Research Design object types |
| [`src/domain/research-brief.ts`](src/domain/research-brief.ts) | Brief normalization, deterministic Gate rules, diffs, and Tutor suggestions |
| [`src/application/research-studio-application.ts`](src/application/research-studio-application.ts) | Host-authoritative mutation use cases |
| [`src/adapter/spec.ts`](src/adapter/spec.ts) | `research_studio` storage-domain schema |
| [`src/adapter/storage.ts`](src/adapter/storage.ts) | Durable project and `ArtifactStore` adapters |
| [`src/adapter/service.ts`](src/adapter/service.ts) | `ctx.researchStudio` Host Service |
| [`src/adapter/controller.ts`](src/adapter/controller.ts) | Thin Typert Remote controller |
| [`src/adapter/skill-bridge.ts`](src/adapter/skill-bridge.ts) | Stage-0 metadata bridge to `ctx.skills` |

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Research package map](../README.md) — package ownership and dependency direction.
- [Storage subsystem](../../../docs/subsystems/storage.md) — persistence service used by the adapter.
- [Research Studio architecture note](../../../.agents/notes/implemented/architecture/2026-08-30-research-studio-plugin-layers.md) — accepted layer boundaries.

-----

<a id="model-experience"></a>
## Model Experience

### Stage-0 skill lookup

#### What the model sees

The package adds no prompt section, Tool, or Agent-loop hook. The existing Skill tool can discover `research-planning`, `problem-formulation`, `scope-definition`, and `feasibility-check` when their profile mounts this Host package.

#### Token effect

Zero direct tokens on ordinary requests. Invoking the existing Skill tool returns the selected Stage-0 skill content.

#### KV Cache effect

None; the package does not change model requests.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- `BRIEF_READY` evaluates structured completeness and recorded resource boundaries; it does not validate academic evidence or external claims.
- The Guided Tutor is deterministic and only proposes explicit unknown markers; it does not call an LLM or fabricate research content.
- Evidence collection, Research Design authoring, literature search, and baseline selection are outside this package's current flow.
- Seed entities are created only when `seedDemoProject` is explicitly enabled and carry `origin: seed`.
- Tree search, multi-agent orchestration, experiment execution, and paper generation are not present.

<a id="dev-note"></a>
### Dev Note

None.
