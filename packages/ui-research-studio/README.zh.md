---
description: "把 Host-backed Research Studio 渲染为 conversation view 的 Client Plugin。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-research-studio

[English](README.md) | 中文

## 概述

`dsh-client-ui-research-studio` 允许研究者管理 project、编写包含 10 个字段的 Research Brief、查看不可变 revision、运行 `BRIEF_READY`，并确认确定性 Tutor proposal。它注册一个 `conversation.view` 条目，并通过 `ctx.remote.researchStudio` 发送所有读取或变更请求。Host response 会替换渲染 projection；浏览器只保留未保存的 form 与 selected-stage state。演示 profile 提供 seed record 时，页面仍会显式标记。

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

在同时挂载 `@deepseek-ai/dsh-research-studio` 与标准 remotes 模块的 Web profile 中挂载此 Client Plugin。现成 bundle 会完成该组合。

```yaml
- id: ui-research-studio
  name: '@deepseek-ai/dsh-client-ui-research-studio'
```

打开非 blank session 并选择 **Research Studio** conversation tab。创建或选择 project，完成并保存 Research Brief，然后评估 Gate。PASS 后可以进入 Evidence navigation，但本包当前 UI 不包含 Evidence authoring。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

| 文件 | 职责 |
|---|---|
| [`src/client/index.ts`](src/client/index.ts) | Locale 与 `conversation.view` 注册 |
| [`src/client/ResearchStudioView.tsx`](src/client/ResearchStudioView.tsx) | Project、Brief、Gate 与 Tutor Remote workflow |
| [`src/client/ResearchStudioView.module.css`](src/client/ResearchStudioView.module.css) | 响应式 Studio 布局 |
| [`src/client/locales.ts`](src/client/locales.ts) | 中英文词典 |

`conversation.view` slot 仍拥有 session 导航与 tab 状态。本包只是消费者；它不替换 shell、renderer 或 Agent Loop。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [Research Studio Host 包](../../research/research-studio/README.zh.md) — snapshot 来源与领域契约。
- [Client 包地图](../README.zh.md) — 浏览器包所有权。
- [Client modules 子系统](../../../docs/subsystems/client-modules.zh.md) — plugin 加载与 boot graph。

-----

<a id="model-experience"></a>
## 模型体验

### Browser-only projection

#### 模型看到什么

本包注册 `conversation.view`，不注册面向模型的 Tool 或 prompt contribution。

#### Token 影响

每次请求直接增加零 token。

#### KV Cache 影响

无；切换 view 不改变模型请求。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- 选中 Stage 是组件本地状态；Host 持久化 project stage 与 authoritative artifact state。
- Evidence 只显示已解锁的 Phase 3 handoff message；当前没有 literature、evidence-card 与 Research Design editor。
- Tutor proposal 会把 missing value 标记为显式 unknown，并要求用户确认；UI 不提供 LLM conversation。
- 当前没有 tree search、multi-agent、experiment runner 或 paper editor。

<a id="dev-note"></a>
### 开发备注

无。
