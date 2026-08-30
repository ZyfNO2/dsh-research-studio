---
description: "组合 Research Studio Host Service 与 Client Plugin 的可安装 Web profile 层。"
kind: "package-bundle"
---

# @deepseek-ai/dsh-research-studio-bundle

[English](README.md) | 中文

## 概述

`dsh-research-studio-bundle` 向既有 Web profile 添加 Phase 2 Research Brief workflow。其 patch 通过两个 profile row 挂载 Host application、storage adapter、Remote controller、Stage-0 Skill bridge 与浏览器 Client Plugin。Bundle 启用带标签的 seed project 用于演示，UI 也可以创建并持久化普通 project。生产 profile 可以用 `seedDemoProject: false` 组合 Host 包。

## 目录

- [安装与使用](#install-and-use)
- [组合](#composition)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="install-and-use"></a>
## 安装与使用

在源码 checkout 中，把本地 bundle 路径安装到 Web profile，完成构建后正常启动 Web：

```powershell
dsh plugin --profile web add F:\path\to\deepseek-harness\packages\bundle\research-studio-bundle
pnpm build
dsh --profile web
```

第一条命令是真实 profile 安装：之后 `--dump-config` 会包含两个 Research Studio row，Web 也会 preload Client Plugin bundle。Source-only browser test 也可以把 [`cordis.patch.yml`](cordis.patch.yml) 作为显式 profile layer 挂载，而不改变用户已经安装的 profile。

-----

<a id="composition"></a>
## 组合

| Row | 包 | 用途 |
|---|---|---|
| `research-studio` | `@deepseek-ai/dsh-research-studio` | Host application、持久化、Remote command、Gate、Tutor 与 Skill bridge |
| `ui-research-studio` | `@deepseek-ai/dsh-client-ui-research-studio` | Project 与 Research Brief `conversation.view` workflow |

标准 `@deepseek-ai/dsh-api-remotes` row 会组装 `researchStudio` Typert namespace。Bundle 不添加 Agent preset，也不替换 Agent Loop。

-----

<a id="model-experience"></a>
## 模型体验

### Composed Stage-0 skill lookup

#### 模型看到什么

Bundle 不添加 prompt 或 Tool。其 Host row 在 `ctx.skills` 中注册 4 个 Stage-0 skill；active Agent preset 包含现有 Skill tool 消费方时，该工具可以发现这些 skill。

#### Token 影响

普通请求直接增加零 token；调用既有 Skill tool 时会返回所选 skill content。

#### KV Cache 影响

在既有 Skill tool 加载某个已注册 definition 之前，bundle 不会改变 request prefix。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- 此演示 bundle 启用带标签的 seed data；它不是生产数据策略。
- 它面向 Web profile，不会把 Research Studio 添加到 headless、ACP 或 SDK profile。
- 它在 Phase 2 Brief Gate 后停止，不组合 Evidence collection 或 Research Design authoring。

<a id="dev-note"></a>
### 开发备注

无。
