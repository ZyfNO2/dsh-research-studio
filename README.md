# Academic Tailor Research Studio (`dsh-research-studio`)

> **Next-Generation Academic Research & Method Tailoring Studio for DeepSeek Harness (DSH)**

English | [中文](#chinese)

---

## Overview

**Academic Tailor Research Studio** is a stateful academic research workspace and plugin suite built for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). It transforms scientific research workflows—from ambiguous initial goals and literature evidence extraction to baseline-module method tailoring, fair experiment matrices, and rigorous scientific paper auditing—into traceable, falsifiable, and gate-verified engineering artifacts.

```
Research Studio Workflow:
┌─────────────────┐     ┌───────────┐     ┌─────────────────┐
│ 0.ResearchBrief │ ──► │1.Evidence │ ──► │ 2.ResearchDesign│
└─────────────────┘     └───────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌───────────┐     ┌─────────────────┐
│   3.BuildSpec   │ ──► │4.Experiment│ ──►│ 5.Paper & Audit │
└─────────────────┘     └───────────┘     └─────────────────┘
```

---

## Package Structure

This repository contains the standalone plugin packages that power Research Studio in DSH:

| Package | Directory | Role & Responsibility |
|---|---|---|
| `@deepseek-ai/dsh-research-studio` | [`packages/research-studio`](packages/research-studio) | Framework-independent domain models, Application service layer, Storage Domain adapter, and Typert Remote Controller. |
| `@deepseek-ai/dsh-client-ui-research-studio` | [`packages/ui-research-studio`](packages/ui-research-studio) | React Web Client presentation plugin with Stage Switcher, Research Brief form, Gate status rail, and bilingual i18n support. |
| `@deepseek-ai/dsh-research-studio-bundle` | [`packages/research-studio-bundle`](packages/research-studio-bundle) | Declarative Cordis patch bundle (`dsh.bundle.patch`) mounting Host and Client plugins into the `web` profile. |

---

## Core Architecture Principles

1. **Research Stage ≠ Agent Loop Phase**: Research Stages (Brief, Evidence, Design, BuildSpec, Experiment, Paper) represent scientific progress and are orthogonal to LLM execution loops.
2. **Concept Orthogonality**: `Stage`, `Skill`, `Agent`, `Tool`, and `Gate` remain separate, modular domain abstractions.
3. **Domain Purity**: Domain logic lives independently of runtime frameworks; adapters connect to Cordis services and Typert RPC.
4. **Host Authoritative State**: Single source of truth is maintained on the Host and persisted via `ctx.storageDomain`; Web Client is pure presentation.
5. **Deterministic Gates**: Stages progress strictly through reproducible, reason-logged Gate evaluations (e.g., `BRIEF_READY`).

---

## Project Status

- **Phase 0 (RPD & Architecture Design)**: ✅ COMPLETE
- **Phase 1 (Plugin Skeleton & Read-Only RPC)**: ✅ COMPLETE
- **Phase 2 (Research Brief Usable Vertical Slice)**: ✅ COMPLETE
- **Phase 3 (Evidence & Research Design Core)**: ⚪ PLANNED

For detailed execution contracts, architecture guardrails, and workstream logs, see [HANDOFF.md](HANDOFF.md) and [docs/Academic_Tailor_Research_Studio_RPD_FINAL_v1.0.md](docs/Academic_Tailor_Research_Studio_RPD_FINAL_v1.0.md).

---

<a id="chinese"></a>
## 中文概述

**Academic Tailor Research Studio（学术裁缝研究工作台）** 是专为 [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) 构建的有状态学术科研与方法缝合套件。它将模糊的科研意图、文献证据抽取、基线+模块组合缝合、公平消融实验矩阵以及论文答辩级科研审计，全面转化为结构化、可证伪且具备 Gate 硬门禁检验的工程化工件体系。

### 包含的插件包

- **`@deepseek-ai/dsh-research-studio`**：纯粹领域模型、Application 用例编排层、持久化存储适配器与 Typert Remote 控制器。
- **`@deepseek-ai/dsh-client-ui-research-studio`**：React Web 客户端插件，提供阶段切换器、立项书编辑器、门禁状态栏与双语支持。
- **`@deepseek-ai/dsh-research-studio-bundle`**：声明式 Cordis Patch Bundle，支持一键挂载到 DSH Web 运行环境中。

---

## 许可证 (License)

MIT License © 2026 Ad astra / DeepSeek Harness Community
