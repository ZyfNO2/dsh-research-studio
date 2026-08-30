---
description: "宿主侧 Research Studio project lifecycle、版本化 Research Brief artifact、确定性 Gate evaluation、Stage-0 skill 与 Typert Remote command。"
kind: "package-reference"
---

# @deepseek-ai/dsh-research-studio

[English](README.md) | 中文

## 概述

`dsh-research-studio` 允许 Web profile 创建并恢复 research project、保存不可变的 Research Brief revision、评估 `BRIEF_READY`，并在不修改 Agent Loop 的情况下解锁 Evidence。其框架无关领域层保持 Stage、Skill、Agent、Tool 与 Gate 概念分离。Application service 通过 project 与 artifact 存储接口拥有变更逻辑，adapter 则暴露 `ctx.researchStudio`、生成的 Typert Remote command 与 4 个 Stage-0 skill。内置 `MVPResearchPreset` 仍是普通注册表数据。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

在 storage-domain service 之后挂载本包。`seedDemoProject` 默认为 false，只供显式标记的演示 profile 使用。

```yaml
- id: research-studio
  name: '@deepseek-ai/dsh-research-studio'
  config:
    seedDemoProject: false
```

Host 消费方读取 `ctx.researchStudio`；浏览器消费方使用由 `@deepseek-ai/dsh-api-remotes` 组装的 `researchStudio` Remote。变更请求返回完整 Host projection；如果预期 artifact id 不是当前 head，陈旧的 Brief write 会失败。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

### 关注点分离

- `src/domain/` 不导入 Cordis、React、浏览器 API 或 DSH package，并保持 Stage、Skill、Agent、Tool reference 与 Gate 概念独立。
- `src/application/` 通过存储接口拥有 project lifecycle、Brief revision 与 diff、Gate evaluation、stage transition 和 Tutor proposal。
- `src/adapter/` 拥有 Cordis 生命周期、既有 storage-domain schema、持久 project 与 artifact adapter、精简的 Typert command 和 Skill registration effect。
- `MVPResearchPreset` 是普通注册表输入，不是固定 workflow enum。

### 源码地图

| 文件 | 职责 |
|---|---|
| [`src/domain/types.ts`](src/domain/types.ts) | 领域契约与品牌化标识符 |
| [`src/domain/registries.ts`](src/domain/registries.ts) | Entity、workflow、stage 与 skill 注册表 |
| [`src/domain/mvp-preset.ts`](src/domain/mvp-preset.ts) | 六阶段 MVP preset 与 Research Design 对象类型 |
| [`src/domain/research-brief.ts`](src/domain/research-brief.ts) | Brief normalization、确定性 Gate rule、diff 与 Tutor suggestion |
| [`src/application/research-studio-application.ts`](src/application/research-studio-application.ts) | Host-authoritative mutation use case |
| [`src/adapter/spec.ts`](src/adapter/spec.ts) | `research_studio` storage-domain schema |
| [`src/adapter/storage.ts`](src/adapter/storage.ts) | 持久 project 与 `ArtifactStore` 适配器 |
| [`src/adapter/service.ts`](src/adapter/service.ts) | `ctx.researchStudio` Host Service |
| [`src/adapter/controller.ts`](src/adapter/controller.ts) | 精简的 Typert Remote controller |
| [`src/adapter/skill-bridge.ts`](src/adapter/skill-bridge.ts) | 接入 `ctx.skills` 的 Stage-0 metadata bridge |

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [Research 包地图](../README.zh.md) — 包所有权与依赖方向。
- [Storage 子系统](../../../docs/subsystems/storage.zh.md) — adapter 使用的持久化 service。
- [Research Studio 架构说明](../../../.agents/notes/implemented/architecture/2026-08-30-research-studio-plugin-layers.zh.md) — 已接受的分层边界。

-----

<a id="model-experience"></a>
## 模型体验

### Stage-0 skill lookup

#### 模型看到什么

本包不添加 prompt section、Tool 或 Agent-loop hook。Profile 挂载本 Host 包后，既有 Skill tool 可以发现 `research-planning`、`problem-formulation`、`scope-definition` 与 `feasibility-check`。

#### Token 影响

普通请求直接增加零 token。调用既有 Skill tool 时会返回所选 Stage-0 skill content。

#### KV Cache 影响

无；本包不改变模型请求。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- `BRIEF_READY` 评估结构完整性与已记录的 resource boundary；它不验证 academic evidence 或 external claim。
- Guided Tutor 采用确定性逻辑，只建议显式 unknown marker；它不调用 LLM，也不编造 research content。
- Evidence collection、Research Design authoring、literature search 与 baseline selection 不在本包当前 flow 内。
- 仅在显式启用 `seedDemoProject` 时创建 seed entity，且记录 `origin: seed`。
- 当前没有 tree search、multi-agent orchestration、实验执行与论文生成。

<a id="dev-note"></a>
### 开发备注

无。
