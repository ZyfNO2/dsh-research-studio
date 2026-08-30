# Phase 3 Design Spec — Evidence & Research Design Core

> 状态：**PROPOSED / REVISE**  
> 适用仓库：`F:\RStudio\dsh-research-studio`  
> 前置版本：Phase 2 `3ffde54`  
> DSH 兼容基线：`cd5ef8148158c3a752a658978873241fdf8e2bbc`

## 1. 决策与前置条件

**当前决策：REVISE，先完成依赖闭环，再开始 Phase 3 业务实现。**

原因不是研究方法本身，而是独立产品仓库当前无法运行 `pnpm run typecheck`：包使用 DSH 的 `workspace:^` 依赖，但本仓库不包含这些工作区包。因此，Phase 3 的每一项实现都必须以可复现的 standalone build/test 为前提；不能只在 `deepseek-harness` 集成靶场中绿灯。

### P3-0 — Compatibility & build closure

P3-0 不改变研究领域能力，目标是为后续每个 Phase 3 PR 建立可信基线。

- 明确 DSH 包的开发依赖策略：版本锁定的已发布包，或受控的本地 DSH checkout 链接；不得继续使用无法解析的裸 `workspace:^`。
- 固定并记录 DSH compatibility baseline、Node、pnpm 与锁文件。
- 在独立仓库通过 `pnpm install`、`pnpm run typecheck`、`pnpm run test`。
- 在 DSH 集成靶场保留独立的 bundle mount / Remote RPC / Web E2E 验证，不将靶场改动作为产品源码提交。

**P3-0 exit gate：** 独立仓库与集成靶场各自有可复现命令，并能在干净 checkout 中通过。

## 2. Phase 3 目标与边界

Phase 3 将已通过 `BRIEF_READY` 的研究问题转为可审计的：

```text
Research Brief
  → verified Evidence Set
  → reproducible frozen Baseline
  → attributed Module candidates
  → compatibility-checked design
  → falsifiable Claim draft
```

这是一条**设计证据链**，不是实验执行链，也不是论文生成链。

### In scope

1. 可人工录入、审阅、关联和版本化的 Literature / Evidence artifacts。
2. 基线候选比较、复现证据和显式 Freeze。
3. 有出处、许可、语义契约和风险说明的 Module candidates。
4. 跨 Baseline / Module 的 Compatibility Matrix 与数据流图。
5. 带预测、guardrail 和 falsifier 的 Claim draft。
6. `EVIDENCE_READY`、`BASELINE_FROZEN`、`DESIGN_FROZEN` 三个确定性 Gate。
7. Host-authoritative Application API、Remote、Client UI 与测试。

### Explicitly out of scope

- 自动联网检索、PDF 批量解析、付费数据库接入和“AI 自动判定文献正确”。
- 代码修改、BuildSpec、Agent dispatch、训练或实验执行。
- 性能结果、论文段落、novelty score、自动接受 Claim。
- Tree Search、多 Agent 编排和替换 DSH Agent Loop。

## 3. 用户可见的三个垂直切片

| Slice | 用户完成的工作 | 产物 | Gate | 不包含 |
|---|---|---|---|---|
| P3-A Evidence | 录入文献/代码来源，抽取并审阅证据，关联 Brief 问题与限制 | `PaperCard`、`EvidenceCard`、`EvidenceLink` | `EVIDENCE_READY` | 自动搜索与 PDF 解析 |
| P3-B Baseline | 比较候选、记录复现事实、选择一个可追溯基线 | `BaselineCard`、`BaselineFreeze` | `BASELINE_FROZEN` | 对基线代码做任何改动 |
| P3-C Design | 录入模块来源与契约，检查边界，形成可证伪主张 | `ModuleCard`、`CompatibilityRecord`、`ClaimDraft` | `DESIGN_FROZEN` | BuildSpec、实验与论文生成 |

每个切片都必须独立可用、可刷新恢复、可追溯。P3-A 完成后即可交付 Evidence Studio；P3-B/P3-C 不能以静态 mock UI 代替真实状态。

## 4. 领域模型

所有新增模型位于 `packages/research-studio/src/domain/`，保持纯 TypeScript；不导入 Cordis、Typert、React 或浏览器 API。所有变更沿用既有 immutable `ArtifactRecord` 版本与 lineage 机制。

### 4.1 Evidence artifacts

```ts
type VerificationStatus = 'unverified' | 'verified' | 'disputed' | 'retracted'
type EvidencePolarity = 'supports' | 'contradicts' | 'context' | 'unknown'

interface PaperCard {
  id: PaperId
  title: string
  authors: string[]
  year?: number
  venue?: string
  identifiers: { doi?: string; arxiv?: string; url?: string }
  sourceKind: 'paper' | 'official-docs' | 'repository' | 'dataset' | 'other'
  provenance: SourceLocator
  verification: VerificationStatus
  license?: string
}

interface EvidenceCard {
  id: EvidenceId
  paperId: PaperId
  locator: SourceLocator              // page / section / figure / commit / issue
  statement: string                   // 原文事实的结构化转述，不是模型结论
  polarity: EvidencePolarity
  supports: EvidenceTarget[]          // Brief gap / baseline candidate / module / claim
  verification: VerificationStatus
  reviewerNote?: string
}
```

规则：`statement` 必须可定位到 primary source；未知信息写作 `unknown`，不能填充推断；`EvidenceCard` 不能直接把“性能更好”升级为 Claim。

### 4.2 Baseline artifacts

```ts
type ReproductionStatus = 'unknown' | 'planned' | 'partial' | 'verified' | 'failed'

interface BaselineCard {
  id: BaselineId
  title: string
  paperIds: PaperId[]
  repository?: { url: string; commit: string; license?: string }
  task: string
  datasetSplit: string
  environment?: string
  checkpoint?: string
  reportedMetric?: MetricFact
  reproducedMetric?: MetricFact
  reproduction: ReproductionStatus
  knownDeviations: string[]
  evidenceIds: EvidenceId[]
}

interface BaselineFreeze {
  baselineId: BaselineId
  frozenAt: Timestamp
  rationale: string
  acceptedDeviationIds: string[]
  frozenBy: ActorId
}
```

一个 repo URL 不构成 Baseline Freeze。Freeze 后修改卡片应生成新 revision，并使 `BASELINE_FROZEN` 与下游 `DESIGN_FROZEN` 失效；若允许未复现 freeze，必须存在明确的 owner-confirmed exception 与理由。

### 4.3 Module、compatibility 与 claim

```ts
interface ModuleCard {
  id: ModuleId
  source: { paperIds: PaperId[]; repository?: string; license?: string }
  originalRole: string
  proposedRole: string
  addressesGap: BriefFieldRef
  input: InterfaceContract
  output: InterfaceContract
  optimization: OptimizationContract
  computeCost?: ComputeEstimate
  predictedEffect: string
  competingExplanation: string
  failureModes: string[]
  evidenceIds: EvidenceId[]
}

interface InterfaceContract {
  semanticUnit: string
  shape: string
  dtype: string
  scale: string
  ordering: string
  maskPolicy: string
  gradientPolicy: string
}

interface CompatibilityRecord {
  producer: DesignNodeRef
  consumer: DesignNodeRef
  contract: InterfaceContract
  adapterRationale?: string
  status: 'unknown' | 'pass' | 'risk' | 'fail'
  requiredChecks: CompatibilityCheck[]
}

interface ClaimDraft {
  statement: string
  condition: string
  mechanism: string
  intervention: string
  predictedMetric: MetricTarget
  guardrails: string[]
  falsifier: string
  evidenceIds: EvidenceId[]
  status: 'proposed' | 'blocked' | 'rejected'
}
```

`InterfaceContract` 不允许只有 shape；缺少 semantic unit、scale、ordering、mask 或 gradient policy 时，compatibility 只能是 `unknown`。`ClaimDraft` 是可证伪设计假设，不能出现“已提升”“显著优于”等实验性措辞。

## 5. Gate 语义与失效规则

Gate 仍是确定性 domain evaluation。Remote 和 UI 只呈现结果，不拥有规则。

| Gate | PASS 条件 | FAIL / 阻断条件 | 失效触发 |
|---|---|---|---|
| `EVIDENCE_READY` | 每个 Brief 核心问题、关键约束和 Baseline 候选都有至少一条 `verified` evidence；所有关键 statement 有 locator | 缺来源、未验证来源被当作事实、证据目标悬空 | Evidence、Brief 或目标关联发生变更 |
| `BASELINE_FROZEN` | 恰有一个 active freeze；Baseline 含 task/split、repo+commit、license、复现状态、依据；未 verified 时有已接受 exception | 多个 active freeze、无 commit、无许可/数据条件、复现失败未解释 | Baseline、freeze rationale 或支持证据变更 |
| `DESIGN_FROZEN` | Frozen Baseline；每个 active Module 有出处/许可/契约/风险；所有数据流边界有 non-unknown compatibility；Claim 含 metric、guardrail、falsifier | shape-only 合法化、缺 provenance、compatibility fail、无 falsifier | Evidence、Baseline、Module、Compatibility 或 Claim 变更 |

Gate 输出应继续采用稳定的 `PASS | FAIL` verdict、machine-readable reason code、面向人的理由与引用 artifact IDs。禁止 LLM 在 gate 内给出不可重放 verdict。

## 6. Application、Storage 与 Remote

### Application use cases

新增业务逻辑放入 `src/application/`，不写在 Remote controller：

```text
createPaperCard / revisePaperCard
createEvidenceCard / verifyEvidenceCard / linkEvidence
createBaselineCandidate / recordReproduction / freezeBaseline / revokeBaselineFreeze
createModuleCandidate / reviseModuleCandidate
upsertCompatibilityRecord
createClaimDraft / reviseClaimDraft
evaluateEvidenceReady / evaluateBaselineFrozen / evaluateDesignFrozen
```

每个 mutation 返回新 Artifact revision、变更摘要、受影响 gate IDs 与重新计算后的 stage status。客户端永远以 Host snapshot/reload 结果为准。

### Storage

- 新 artifact 类型复用版本化 `ArtifactStore`；不建立绕过 lineage 的单独 CRUD 表。
- 为 project-level active baseline freeze 建立小型索引状态；索引仅用于选择，权威解释仍来自 artifacts。
- `SourceLocator` 与 verification review 必须持久化，不能只存 UI note。
- migration 要兼容 Phase 1/2 项目：不存在的 Evidence/Design 数据等于空集合与 locked downstream stage。

### Remote

Remote 增加窄命令和只读 projection，不暴露 store/table 细节：

```text
researchStudio.listEvidence(projectId)
researchStudio.saveEvidence(command)
researchStudio.listBaselines(projectId)
researchStudio.freezeBaseline(command)
researchStudio.listDesign(projectId)
researchStudio.saveModule(command)
researchStudio.saveCompatibility(command)
researchStudio.saveClaim(command)
researchStudio.evaluateGate(projectId, gateId)
```

输入由 Typert schema 验证；授权与业务约束由 Application 服务执行；controller 不缓存领域状态、不自行补齐字段。

## 7. Client 信息架构

沿用现有 `conversation.view` 和 Host snapshot 机制，不替换 DSH shell 或 Agent Loop。

### P3-A Evidence Studio

- 左列：Evidence Set（筛选：verification、target、source kind）。
- 中列：Evidence Matrix（Brief gap / constraint × evidence）。
- 右侧抽屉：PaperCard、定位信息、结构化 statement、review 与 link 操作。
- 顶部：`EVIDENCE_READY` 状态、缺失项和明确下一步；不显示“AI 已验证”的虚假暗示。

### P3-B Baseline Studio

- Baseline candidate 比较表：task/data、repo commit、license、reproduction、reported/reproduced metric、evidence coverage。
- Freeze action 需显示不可变 snapshot、rationale 与 exception（如有）。
- 冻结后只允许“revise → re-evaluate → re-freeze”路径；不提供静默就地改写。

### P3-C Research Design Studio

- Baseline / Module / Reference / Claim 四个对象区，保留 RPD 的信息架构但不逐像素复制 prototype。
- Compatibility Matrix 显示每个 producer → consumer 边界以及 semantic、shape、scale、mask/order、gradient 的状态。
- Claim Editor 强制填写 condition、mechanism、prediction、guardrail、falsifier；缺任一字段不能请求 `DESIGN_FROZEN`。

所有可见文案继续由 `locales.ts` 所有；seed/demo 数据必须带 `origin: seed` 标识，且不与真实 artifact 混淆。

## 8. 实现顺序与验收

### P3-A acceptance

1. 已通过 `BRIEF_READY` 的 project 可创建、修订、验证 Paper/Evidence cards。
2. Evidence 与 Brief/Baseline target 的关联在刷新和服务重启后恢复。
3. `EVIDENCE_READY` 对缺 locator、未验证关键证据、悬空 target 给出稳定失败原因。
4. Client UI 从 Host Remote 读取 matrix，不使用本地 mock 作为 fallback。

### P3-B acceptance

1. 用户能创建多个 Baseline candidate，并记录 commit、license、data split、复现状态与指标事实。
2. 只能有一个 active `BaselineFreeze`；变更基线或依据会让 freeze 失效。
3. `BASELINE_FROZEN` 的通过/失败在 refresh 后一致。

### P3-C acceptance

1. 每个 Module card 有 provenance、输入输出契约、风险和失败模式。
2. compatibility 在缺失语义字段时不能 PASS；不能因 shape 相同自动 PASS。
3. Claim 无 falsifier、metric 或 guardrail 时不能冻结。
4. `DESIGN_FROZEN` PASS 后才解锁 BuildSpec；本阶段不生成 BuildSpec。

### Regression evidence

- Domain：artifact validation、revision lineage、gate invalidation、compatibility failure cases。
- Application：mutation flow、active freeze uniqueness、migration/recovery。
- Client：matrix rendering、gate error display、seed labeling、refresh state。
- Bundle/DSH：真实 Web profile mount、Remote command roundtrip、浏览器 E2E。
- 每个 P3 slice 完成后分别提交；不等待所有三个 slice 才验证。

## 9. 风险与停止条件

| 风险 | 处理 | Stop / pivot 条件 |
|---|---|---|
| 文献事实不可验证 | 保持 `unverified`，要求 locator 与 review | 关键 Claim 只有 unverified 证据时停止冻结 |
| Baseline 不能复现 | 记录 failed/partial 与偏差 | 无 owner-accepted exception 时停止 Module 设计 |
| 模块仅 shape compatible | 创建完整 InterfaceContract 与最小检查 | semantic / mask / gradient 不明时拒绝 `DESIGN_FROZEN` |
| 模块重叠或无机制解释 | 保留 competing explanation，优先删减 | 无可区分预测时拒绝 Claim |
| 外部 API / paywall | 保持人工输入和 source locator | 不因凭据缺失引入未验证自动化 |
| DSH 依赖模型未闭环 | 完成 P3-0 | 不开始业务实现或宣称回归通过 |

## 10. Deferred to later phases

- Phase 4：BuildSpec、代码库检查、config-gated module integration、实验 ledger 与 run dispatch。
- Phase 5：实验结果到 Claim/Evidence trace、审稿与论文写作 audit。
- Phase 6：tree search、多 agent 分支与自主研究。

本规格中的 Claim 是**设计级假设**。只有在后续公平、可重复的实验矩阵满足预设判据后，才可以转换为受支持的实验 Claim。
