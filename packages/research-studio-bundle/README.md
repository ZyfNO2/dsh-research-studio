---
description: "Installable Web profile layer composing the Research Studio Host Service and Client Plugin."
kind: "package-bundle"
---

# @deepseek-ai/dsh-research-studio-bundle

English | [中文](README.zh.md)

## Summary

`dsh-research-studio-bundle` adds the Phase 2 Research Brief workflow to an existing Web profile. Its patch mounts the Host application, storage adapters, Remote controller, Stage-0 Skill bridge, and browser Client Plugin as two profile rows. The bundle enables a labeled seed project for demonstration, while the UI can also create and persist ordinary projects. Production profiles can compose the Host package with `seedDemoProject: false`.

## Table of Contents

- [Install and use](#install-and-use)
- [Composition](#composition)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="install-and-use"></a>
## Install and use

From a source checkout, install the local bundle path into the Web profile, build, and start Web normally:

```powershell
dsh plugin --profile web add F:\path\to\deepseek-harness\packages\bundle\research-studio-bundle
pnpm build
dsh --profile web
```

The first command is a real profile install: `--dump-config` then includes both Research Studio rows, and Web preloads the Client Plugin bundle. A source-only browser test can instead mount [`cordis.patch.yml`](cordis.patch.yml) as an explicit profile layer without changing the user's installed profile.

-----

<a id="composition"></a>
## Composition

| Row | Package | Purpose |
|---|---|---|
| `research-studio` | `@deepseek-ai/dsh-research-studio` | Host application, persistence, Remote commands, Gate, Tutor, and Skill bridge |
| `ui-research-studio` | `@deepseek-ai/dsh-client-ui-research-studio` | Project and Research Brief `conversation.view` workflow |

The standard `@deepseek-ai/dsh-api-remotes` row assembles the `researchStudio` Typert namespace. The bundle adds no Agent preset and does not replace the Agent Loop.

-----

<a id="model-experience"></a>
## Model Experience

### Composed Stage-0 skill lookup

#### What the model sees

The bundle adds no prompt or Tool. Its Host row registers four Stage-0 skills in `ctx.skills`, which the existing Skill tool can discover when the active Agent preset includes that consumer.

#### Token effect

Zero direct tokens on ordinary requests; invoking the existing Skill tool returns selected skill content.

#### KV Cache effect

The bundle leaves the request prefix unchanged until the existing Skill tool loads one of the registered definitions.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- This demo bundle enables labeled seed data; it is not a production data policy.
- It targets the Web profile and does not add Research Studio to headless, ACP, or SDK profiles.
- It stops after the Phase 2 Brief Gate. Evidence collection and Research Design authoring are not composed.

<a id="dev-note"></a>
### Dev Note

None.
