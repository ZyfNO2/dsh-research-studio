---
description: "Client Plugin that renders the Host-backed Research Studio as a conversation view."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-research-studio

English | [中文](README.zh.md)

## Summary

`dsh-client-ui-research-studio` lets a researcher manage projects, author a ten-field Research Brief, inspect immutable revisions, run `BRIEF_READY`, and confirm deterministic Tutor proposals. It registers a `conversation.view` entry and sends every read or mutation through `ctx.remote.researchStudio`. Host responses replace the rendered projection; the browser keeps only unsaved form and selected-stage state. Seed records, when supplied by a demo profile, remain visibly labeled.

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

Mount the Client Plugin in a Web profile that also mounts `@deepseek-ai/dsh-research-studio` and the standard remotes module. The ready-made bundle does this composition.

```yaml
- id: ui-research-studio
  name: '@deepseek-ai/dsh-client-ui-research-studio'
```

Open a non-blank session and choose the **Research Studio** conversation tab. Create or select a project, complete the Research Brief, save it, and evaluate the Gate. Evidence navigation becomes available after a PASS, but Evidence authoring remains outside this package's current UI.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

| File | Role |
|---|---|
| [`src/client/index.ts`](src/client/index.ts) | Locale and `conversation.view` registration |
| [`src/client/ResearchStudioView.tsx`](src/client/ResearchStudioView.tsx) | Project, Brief, Gate, and Tutor Remote workflow |
| [`src/client/ResearchStudioView.module.css`](src/client/ResearchStudioView.module.css) | Responsive Studio layout |
| [`src/client/locales.ts`](src/client/locales.ts) | Chinese and English dictionaries |

The `conversation.view` slot remains the owner of session navigation and tab state. This package is a consumer; it does not replace the shell, renderer, or Agent Loop.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Research Studio Host package](../../research/research-studio/README.md) — snapshot source and domain contracts.
- [Client package map](../README.md) — browser package ownership.
- [Client modules subsystem](../../../docs/subsystems/client-modules.md) — plugin loading and boot graph.

-----

<a id="model-experience"></a>
## Model Experience

### Browser-only projection

#### What the model sees

The package registers `conversation.view` and no model-facing Tool or prompt contribution.

#### Token effect

Zero direct tokens on every request.

#### KV Cache effect

None; changing views does not change a model request.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- The selected Stage is component-local; the Host persists the project stage and authoritative artifact state.
- Evidence displays only an unlocked Phase 3 handoff message; literature, evidence-card, and Research Design editors are absent.
- Tutor proposals mark missing values as explicit unknowns and require confirmation; the UI does not provide an LLM conversation.
- No tree search, multi-agent, experiment runner, or paper editor is present.

<a id="dev-note"></a>
### Dev Note

None.
