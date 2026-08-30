# Agent Note: Research Studio 采用领域层、Host adapter、Client Plugin 与 bundle 分层

Status: implemented

[English](2026-08-30-research-studio-plugin-layers.md) | 中文

## 问题

Academic Research Studio 需要持久研究项目、可扩展注册表与 Web 界面，同时不能修改 Core Agent Loop，也不能让领域模型绑定不稳定的 Harness 内部实现。其六阶段 MVP 是默认 workflow 形态，不是永久产品边界。Stage、Skill、Agent、Tool 与 Gate 即使在一个 Preset 中产生关联，也必须保持概念独立。

## 决策

实现使用四个显式层次：

1. `packages/research/research-studio/src/domain` 拥有框架无关契约与注册表。`MVPResearchPreset` 是普通 registry input。
2. `src/application` 通过 project 与 artifact 存储接口实现 project、版本化 Brief、确定性 Gate、Stage transition 与 Tutor use case。
3. `src/adapter` 拥有 DSH 特定集成：Cordis Service、保持不变的 storage-domain table、project 与 artifact 存储适配器、精简的 Typert Remote command，以及把 4 个 Stage-0 skill 接入 `ctx.skills` 并遵循生命周期的 bridge。
4. `packages/client/ui-research-studio` 是占用 `conversation.view` 的 Client Plugin。它通过生成的 Remote 发送变更请求，以 Host response 替换投影，仅在本地保留未保存的 form 与 navigation state。
5. `packages/bundle/research-studio-bundle` 是可安装的 Web profile patch，组合 Host 与 Client row。既有 `api/remotes` assembly 挂载该 Remote namespace。

Research Stage 不复用 DSH Agent Loop phase 或 workflow engine。`StageDefinition` 分别携带 Skill identifier、Tool reference 与 Gate identifier，不把这些概念变成别名。领域层不导入 Cordis 或 DSH package。每次 Brief edit 都会创建不可变 artifact revision，使针对旧 head 的 Gate verdict 失效，并把 project 恢复到 Research Brief stage。只有 project stage 与 PASS evaluation 同时引用当前 Brief head 时，Evidence 才会解锁。

## 考虑过的替代方案

- **直接向 Core 或 Web bundle 添加 Research Studio row 与状态。** 拒绝，因为移除与独立演进会需要 Core 改动，产品特定状态也会变成应用边界。
- **把六个 Research Stage 建模为 DSH workflow phase。** 拒绝，因为研究分类与执行生命周期是不同维度；该做法会硬编码 MVP，并混淆 Stage 与执行。
- **把用户提供的静态 prototype 直接作为产品页面。** 拒绝，因为它不能证明 Host 状态、Remote transport、Client Plugin 加载或 registry-driven UI。
- **让 Client 拥有 mock registry data 或乐观 primary state。** 拒绝，因为 UI 成功可能掩盖 Host 集成故障或 stale-write rejection。演示记录与 mutation result 均由 Host 拥有，seed record 显式报告 `origin: seed`。
- **新增 transaction、workflow 或全局 Skill-provider framework。** 拒绝，因为 Phase 2 只需要一个 application service 和 4 个普通 `ctx.skills.register` effect；额外基础设施不能改善当前验收路径。

## 后果

- 领域层无需 Harness runtime dependency 即可单测，并可在窄 adapter 后独立演进。
- Web profile 能以 plugin layer 添加或移除 Research Studio；Agent Loop 保持不变。
- Phase 2 UI 通过真实的 storage-backed Host Service → Application Service → Typert Remote → Client Plugin 路径支持 project lifecycle、结构化 Brief authoring、revision history、确定性 Gate evaluation、Evidence unlocking 与确认后的 Tutor proposal。
- 4 个 Stage-0 skill 共享 Host plugin lifecycle，并可通过既有 Skill registry 发现，无需改变其全局 provider lifecycle。
- Evidence collection 与 Research Design 仍未实现。添加其 artifact 与 view 需要新的 Phase 3 决策，不能以推测方式扩展 Phase 2 Brief flow。
