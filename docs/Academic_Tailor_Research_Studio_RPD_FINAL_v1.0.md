# Academic Tailor Research Studio — Final RPD v1.0

> **产品名称**：Academic Tailor Research Studio
> **形态**：DeepSeek Harness（DSH）插件 + Research Studio
> **版本**：RPD v1.0
> **日期**：2026-08-30
> **状态**：Ready for Implementation Planning
> **核心原则**：**MVP 剪枝，但架构不剪枝。6 个 Stage 只是默认 Workflow Preset，不是产品能力边界。**

---

# 0. 文档目标

本 RPD 定义一个面向论文科研项目的：

- 有状态；
- 可讨论；
- 可审阅；
- 可回退；
- Artifact 驱动；
- 可扩展 Skill；
- 可对接 Coding Agent；
- 可进行真实实验与 Claim 审计；

的 **Research Studio**。

系统不以“一键生成论文”为核心，而以：

```text
用户讨论
→ 研究状态结构化
→ Artifact
→ Gate
→ Coding / Experiment
→ Evidence
→ Claim
→ Paper
```

为主线。

---

# 1. 产品定位

## 1.1 一句话定位

**把“导师辅导 + 文献拆解 + 学术裁缝 + Coding Agent + 实验回流 + 论文审查”组织成一个可持续迭代的科研工作台。**

---

## 1.2 产品目标

系统需要帮助用户完成：

1. 从模糊方向形成 Research Brief；
2. 建立可追踪的 Literature / Evidence；
3. 选择并冻结 Baseline；
4. 形成多个候选创新方案；
5. 将方法拆成 Base / Module / Reference / Claim 等对象；
6. 用科研 Skill 辅导用户讨论，而不是一次脑补完整方案；
7. 将研究设计转换为 BuildSpec；
8. 通过 DSH Coding Agent 真实实现；
9. 通过实验验证 / 推翻 Hypothesis；
10. 实验失败后进行 Diagnosis + Backflow；
11. 由 Verified Artifact 生成论文；
12. 最后进行 Claim / Citation / Method / Experiment Audit。

---

# 2. 核心产品原则

```text
不是一键生成
而是 Research Studio

不是聊天记录
而是 Artifact

不是第一想法
而是 Candidate Pool

不是模块拼接
而是 Falsifiable Hypothesis

不是单次实验
而是 Experiment Loop

不是失败重试
而是 Diagnosis + Backflow

不是最好数字
而是 Fair Comparison

不是生成完就写
而是 Claim → Evidence Trace

不是固定六步
而是 Workflow Preset

不是 DSH 魔改
而是 Plugin + Adapter
```

---

# 2.1 实用主义实施准则与减负决断 (Pragmatic Execution Principles)

针对实际科研落地与 MVP 研发边界，系统确立以下 4 条核心实施纪律：

1. **专注文书与证据汇总（No Code Execution Burden）**：系统核心是科研推导、证据链沉淀、假设声明与文书引导工作；不承担重度代码沙箱调度、容器环境管理或实验代码自动运行。用户如何准备代码与产出实验数据由用户自行决定，系统负责结构化接收并建立 Evidence 溯源。
2. **务实引导与学术诚信警告（Pragmatic Assistance with Integrity Warnings）**：面对负结果、实验 Trick 或论文调整诉求，系统不采取阻断式的强行回滚，而是顺应用户研究需要协助整理文书与实验记录；但系统必须在 UI 和审计报告中尽到显式的“学术诚信与审稿风险警告”提示义务。
3. **证据离线优先与轻量导入（Offline-First Manual Import）**：MVP 阶段不强依赖外部学术 API（如 Semantic Scholar / arXiv 联网鉴权），优先提供 BibTeX、文本粘贴、结构化表单与本地文档拖拽解析等手动导入渠道，确保离线及任意网络环境下可用。
4. **非阻塞式柔性门禁与上下文倾向（Flexible Gates with Context Affinity）**：Gate 系统作为“智能就绪度检查与建议”，不作为阻断用户跳步操作的硬卡点。各阶段支持双向上下文联动（例如选定 Baseline/方案后，自动为 Literature 学习提供倾向性上下文推荐）。

---

# 3. 默认 MVP Workflow

```text
0. Research Brief
        ↓
1. Evidence / Literature
        ↓
2. Research Design
        ↓
3. BuildSpec & Implementation
        ↓
4. Experiment & Diagnosis
        ↓
5. Paper & Audit
```

当前 6 Stage 只作为：

```text
MVPResearchPreset
```

未来可以增加：

```text
Graduation Goal
Supervisor Analysis
Proposal
Midterm
Small Paper
Revision
Rebuttal
Pre-defense
Defense
```

无需推翻 Core。

---

# 4. Workflow Architecture

## 4.1 Stage Registry

系统不能写死：

```text
if stage == 1
if stage == 2
...
```

应实现：

```text
WorkflowPreset
    ↓
StageRegistry
    ↓
StageDefinition[]
```

---

## 4.2 Stage Contract

每个 Stage 使用统一 Contract：

```ts
interface StageDefinition {
  id: string
  version: string
  title: string

  prerequisites: StageRequirement[]
  optional: boolean

  inputs: ArtifactType[]
  outputs: ArtifactType[]

  agentRoles: string[]
  skills: SkillRef[]
  tools: ToolRef[]

  systemPrompt: PromptRef
  tutorPrompt: PromptRef
  reviewPrompt: PromptRef

  gates: GateRef[]

  allowedActions: string[]
  forbiddenActions: string[]

  nextStages: string[]
  fallbackStages: string[]
}
```

> 上述为领域模型约束，不要求最终 API 完全同形。

---

# 5. Skill / Agent / Stage / Tool 边界

## Skill

科研方法与 Prompt。

例如：

```text
research-gap
novelty-assessment
experiment-design
claim-verification
```

## Agent

承担角色职责。

例如：

```text
Research Tutor
Evidence Researcher
Reviewer
Writer
```

## Stage

产品业务阶段。

例如：

```text
Research Design
Experiment
```

## Tool

真实执行动作。

例如：

```text
paper_search
repo_inspect
run_test
execute_experiment
```

关系：

```text
Stage
├── Agent Role
├── Skills
├── Tools
├── Artifacts
└── Gates
```

---

# 6. Research Tutor Layer

Tutor 不是普通聊天窗口。

默认 Loop：

```text
读取 Stage State
      ↓
找到 Missing / Conflict / Unknown
      ↓
选择 1~3 个关键问题
      ↓
与用户讨论
      ↓
更新 Draft Artifact
      ↓
判断 Gate
```

原则：

- 每轮只解决少量关键未决问题；
- 不允许一次自动脑补完整论文；
- User Decision 与 Agent Proposal 必须区分；
- 可从任意 SubStage 继续；
- 用户可以直接编辑 Artifact。

---

## 6.1 Tutor Mode

### Guided

导师式逐步询问。

### Fast

Agent 根据现有 Artifact 创建 `PROPOSED` 草案。

### Expert

用户直接修改结构化 Artifact，Agent 只检查。

### Review

Agent 只指出缺陷，不主动替用户重构整个方案。

MVP 默认：

```text
GUIDED
```

---

# 7. Stage 0 — Research Brief

## Mission

把模糊需求转为 Research Contract。

本阶段不能直接提出最终创新方法。

---

## SubStage

```text
① Research Goal
② Academic Constraints
③ Research Direction
④ Existing Foundation
⑤ Data / Code / Compute
⑥ Time / Resource Budget
⑦ Existing Assets
⑧ Brief Review
```

---

## Default Skills

```text
research-planning
problem-formulation
scope-definition
feasibility-check
```

---

## Optional Skills

```text
supervisor-fit-analysis
venue-targeting
graduation-requirement-analysis
```

---

## Output

```text
ResearchBrief
```

字段至少包括：

```text
problem_domain
research_goal
constraints
timeline
available_data
available_code
compute
current_foundation
initial_direction
unknowns
```

---

## Gate

```text
BRIEF_READY
```

要求：

- Problem 不为空；
- 资源限制基本明确；
- Unknown 明确标记；
- Proposed / Verified 不混淆。

---

# 8. Stage 1 — Evidence / Literature

## Mission

构建后续 Research Design 可直接消费的 Evidence Set。

不是单纯“总结论文”。

---

## SubStage

```text
① Search Question Decomposition
② Paper Retrieval
③ Paper Card
④ Evidence Extraction
⑤ Code Repo Mapping
⑥ Classification
⑦ Literature Map
⑧ Evidence Review
```

---

## Default Skills

```text
literature-search
paper-reading
paper-decomposition
literature-review
evidence-extraction
citation-verification
```

---

## Optional Skills

```text
systematic-literature-review
deep-research
cross-paper-comparison
figure-table-analysis
repo-mapping
bibliography-management
```

---

## Research Entity Types

```text
BASELINE_CANDIDATE
MODULE_SOURCE
COMPETITOR
SUPPORTING_EVIDENCE
BACKGROUND
DATASET
METRIC
CODE_REPOSITORY
```

---

## Paper Card

```text
Paper
├── metadata
├── problem
├── method
├── dataset
├── metric
├── claim
├── limitation
├── code
└── reproducibility
```

---

## Evidence Card

```text
EvidenceCard
├── statement
├── source
├── location
├── evidence_type
├── supports
├── confidence
└── verification_status
```

---

## Output

```text
PaperLibrary
EvidenceCards
CodeRepoLibrary
LiteratureMap
```

---

## Gate

```text
EVIDENCE_READY
```

---

# 9. Stage 2 — Research Design

这是产品第一核心阶段。

---

# 9.1 Research Object Studio

UI 与 State 中需要把研究内容拆成不同对象。

```text
CORE
└── Baseline / Base

MODULE
├── Module B
├── Module C
└── Candidate Module

REFERENCE
├── Module Source
├── Supporting Reference
├── Background Reference
└── Competitor

RESEARCH LOGIC
├── Problem
├── Limitation
├── Hypothesis
└── Candidate Idea

EVIDENCE
├── Dataset
├── Metric
├── Experiment
└── Result

CLAIM
├── Main Claim
├── Supporting Claim
└── Rejected Claim
```

---

# 9.2 Problem / Gap Studio

## SubStage

```text
① Observed Problem
② Limitation
③ Condition
④ Candidate Mechanism
⑤ Supporting Evidence
⑥ Falsifiable Hypothesis
⑦ Gap Review
```

---

## Default Skills

```text
research-gap
problem-formulation
hypothesis-design
mechanism-reasoning
```

---

## Optional Skills

```text
contradiction-mining
rival-explanation
formalization
causal-reasoning
```

---

## Hypothesis Contract

推荐结构：

```text
Under condition C,
limitation L occurs because mechanism M;
intervention B should change metric Y
without violating guardrail G.
```

---

# 9.3 Baseline Studio

支持多个实例：

```text
Baseline A
Candidate A2
Candidate A3
Rejected Baseline
```

---

## SubStage

```text
① 基础档案
② 复现档案
③ 机制解剖
④ Weakness Palette
⑤ Modification Surface
⑥ Baseline Tutor（可选）
⑦ 完成审阅
```

---

## Default Skills

```text
baseline-selection
baseline-reproduction
architecture-analysis
weakness-analysis
```

---

## Optional Skills

```text
repo-analysis
benchmark-comparison
complexity-analysis
```

---

## Weakness Type

```text
AUTHOR_REPORTED
LITERATURE_REPORTED
USER_OBSERVED
EXPERIMENT_OBSERVED
INFERRED
UNVERIFIED
```

---

## Baseline Freeze

```text
BaselineFreeze
├── repo
├── commit
├── environment
├── checkpoint
├── dataset_split
├── preprocessing
├── seed_policy
├── official_metric
└── reproduced_metric
```

---

# 9.4 Candidate Idea Studio

禁止：

```text
想到第一个方案
→ 直接 Coding
```

要求：

```text
Idea 01
Idea 02
Idea 03
...
      ↓
Compare
      ↓
Select / Reject
```

---

## Default Skills

```text
idea-generation
novelty-assessment
feasibility-analysis
research-risk-analysis
```

---

## Candidate Score

```text
Problem Fit
Mechanism Fit
Novelty
Evidence
Compatibility
Implementation Cost
Experiment Cost
Compute
Risk
Expected Information Gain
```

---

## Lifecycle

```text
CANDIDATE
SHORTLISTED
ACCEPTED
REJECTED
DEPRECATED
```

---

# 9.5 Module Studio

实例：

```text
Module B
Module C
Candidate B1
Rejected C2
```

---

## SubStage

```text
① Provenance
② Original Role
③ Proposed Role
④ Mechanism Hypothesis
⑤ Interface Contract
⑥ Compatibility
⑦ Workload
⑧ Conflict / Overlap
⑨ Review
```

---

## Default Skills

```text
method-tailoring
module-analysis
compatibility-check
integration-design
```

---

## Optional Skills

```text
algorithm-design
complexity-analysis
formal-method-description
alternative-module-search
```

---

## Compatibility Contract

必须检查：

```text
shape
dtype
semantics
scale
normalization
mask
ordering
temporal / spatial meaning
gradient
trainability
loss
objective
compute
license
```

不能仅依据 shape 判断可兼容。

---

# 9.6 Research Story

不是论文正文。

只维护：

```text
Problem
↓
Why Baseline Fails
↓
Mechanism Hypothesis
↓
Intervention
↓
Expected Observation
↓
Potential Limitation
```

---

## Default Skills

```text
research-story
contribution-analysis
novelty-assessment
```

---

# 9.7 Design Review

## Default Skills

```text
novelty-audit
method-audit
claim-precheck
```

---

## Output

```text
ResearchDesign
CompatibilityMatrix
CandidateIdeas
DecisionLedger
```

Gate：

```text
DESIGN_APPROVED
```

---

# 10. Stage 3 — BuildSpec & Implementation

这是 Research Agent 与 Coding Agent 的边界。

```text
ResearchDesign
      ↓
BuildSpec
      ↓
Review
      ↓
DSH Coding Agent
```

---

## SubStage

```text
① Repo Inspection
② Modification Surface
③ BuildSpec
④ Implementation Plan
⑤ Incremental Coding
⑥ Sanity Verification
⑦ Build Review
```

---

## Default Skills

```text
github-research
paper-to-code
implementation-planning
code-debugging
```

---

## Optional Skills

```text
architecture-review
dependency-analysis
test-planning
performance-profiling
```

---

## Repo Inspection

真实读取：

```text
default branch
target branch
HEAD
directory structure
existing implementation
tests
CI
handoff
```

不得仅依据旧设计文档假设仓库状态。

---

## BuildSpec

```text
BuildSpec
├── baseline
│   ├── repo
│   └── commit
│
├── modification
│   ├── files
│   ├── modules
│   └── insertion_points
│
├── contracts
│   ├── input
│   ├── output
│   ├── loss
│   └── training
│
├── implementation_steps
├── config_switches
├── tests
├── expected_artifacts
└── experiment_plan
```

---

## Implementation Rule

一个 Module 一次接入。

```text
import/config
→ shape/dtype
→ semantic alignment
→ forward/loss
→ gradient
→ tiny sanity test
→ baseline parity
→ full experiment
```

必须：

- 保留 Baseline path；
- 通过 config 开关控制 Module；
- 不允许通过无法解释的 reshape / projection 掩盖语义问题。

---

## Output

```text
BuildSpec
ImplementationPlan
RepoSnapshot
ImplementationTrace
```

Gate：

```text
BUILD_READY
```

---

# 11. Stage 4 — Experiment & Diagnosis

这是产品第二核心阶段。

---

## SubStage

```text
① Experiment Plan
② Baseline Verification
③ Single Module Runs
④ Full Method
⑤ Ablation
⑥ Comparison
⑦ Diagnosis
⑧ Experiment Review
```

---

## Default Skills

```text
experiment-design
ablation-design
fair-comparison
failure-analysis
reproducibility
data-analysis
```

---

## Optional Skills

```text
statistical-testing
robustness-analysis
efficiency-analysis
error-analysis
backward-traceability
```

---

## Minimum Experiment Matrix

```text
A
A+B
A+C
A+B+C

A+B+C-B
A+B+C-C

Strong Competitor
```

必要时增加：

```text
Interaction
Efficiency
Robustness
Failure Case
```

---

## Fairness Contract

尽量保持：

```text
dataset
split
preprocessing
evaluation
training budget
tuning budget
seed policy
hardware reporting
```

---

## Experiment Loop

```text
RUN
 ↓
VALIDATE
 ↓
COMPARE
 ↓
HYPOTHESIS CHECK
 ↓
PASS ─────────────→ NEXT
 ↓
FAIL
 ↓
DIAGNOSIS
 ↓
FIX / PIVOT / REJECT
```

---

## Diagnosis Type

```text
IMPLEMENTATION_FAILURE
BASELINE_REPRO_FAILURE
INTERFACE_FAILURE
TRAINING_FAILURE
METRIC_FAILURE
HYPOTHESIS_FAILURE
NO_EFFECT
NEGATIVE_INTERACTION
RESOURCE_LIMIT
DATA_LIMIT
```

---

## Backflow

```text
Implementation Failure
→ BuildSpec

Interface Failure
→ Module Studio

Hypothesis Failure
→ Research Design

Evidence Insufficient
→ Evidence Stage

Claim Unsupported
→ Claim / Experiment
```

---

## Ledger

```text
ExperimentLedger
FailureLedger
DecisionLedger
ClaimLedger
```

失败结果不得覆盖或删除。

---

## Gate

```text
EXPERIMENT_EVIDENCE_READY
```

---

# 12. Stage 5 — Paper & Audit

只允许从 Verified Artifact 写。

Writing Agent 不允许从聊天 Brainstorm 中直接提取“实验事实”。

---

## SubStage

```text
① Claim Studio
② Story / Outline
③ Method
④ Experiment Section
⑤ Discussion
⑥ Limitation
⑦ Full Draft
⑧ Reviewer
⑨ Evidence Audit
```

---

## Default Skills

```text
claim-verification
paper-writing-section
related-work-writing
self-review
research-paper-review
```

---

## Optional Skills

```text
citation-management
paper-revision
rebuttal
venue-check
preflight-check
defense-preparation
```

---

# 12.1 Claim Studio

```text
Main Claim
Supporting Claim
Rejected Claim
Unknown Claim
```

状态：

```text
PROPOSED
INFERRED
SUPPORTED
REJECTED
UNKNOWN
```

只有：

```text
SUPPORTED
```

才能在最终稿中作为本项目实验结论。

---

## Claim Trace

```text
Claim
→ Result
→ Experiment
→ BuildSpec
→ Method
→ Evidence
→ Source
```

---

## Audit

至少检查：

```text
Claim-Evidence
Citation
Attribution
Experiment Provenance
Baseline Fairness
Reproducibility
Unsupported Performance Claim
Novelty Overclaim
Missing Limitation
```

---

## Output

```text
ClaimLedger
Outline
Methodology
Experiment
Discussion
Limitations
Manuscript
AuditReport
```

---

## Final Judgment

```text
GO
REVISE
NO-GO
```

---

# 13. Default Research Skill Pack

MVP 默认内置约 15 个高频 Skill。

```text
research-planning
problem-formulation

literature-search
literature-review
evidence-extraction
citation-verification

idea-generation
novelty-assessment
baseline-selection
method-tailoring
compatibility-check

github-research
implementation-planning

experiment-design
failure-analysis

claim-verification
self-review
```

> 开发中可以根据实现成本再缩减，但 Skill Registry 必须保留扩展能力。

---

# 14. Optional Skill Packs

## Literature Pack

```text
deep-research
systematic-literature-review
paper-decomposition
cross-paper-comparison
figure-table-analysis
bibliography-management
```

## Method Pack

```text
algorithm-design
complexity-analysis
formalization
rival-explanation
alternative-module-search
```

## Experiment Pack

```text
statistical-testing
robustness-analysis
efficiency-analysis
error-analysis
backward-traceability
```

## Writing Pack

```text
related-work-writing
citation-management
paper-revision
rebuttal
venue-check
preflight-check
```

## Thesis Pack

```text
proposal-writing
midterm-review
thesis-structure
pre-defense-review
defense-preparation
```

---

# 15. Skill Contract

每个 Skill 至少定义：

```text
id
version

mission

inputs
outputs

knowledge
procedure

boundaries
failure_conditions

references
examples
```

每个 Skill：

- 只负责一个清晰科研任务；
- 不负责控制整个 Workflow；
- 可以被不同 Stage 重用；
- 可以被用户替换或覆盖。

---

# 16. Skill Injection

Stage 不把所有 Prompt 写死。

默认：

```text
Global Research Policy
      +
Stage Prompt
      +
Selected Skill Prompt
      +
Current Artifact Context
```

独立：

```text
Tutor Prompt
Reviewer Prompt
```

---

## 16.1 Stage Skill 配置示例

```yaml
stage: research-design

default_skills:
  - idea-generation
  - novelty-assessment
  - baseline-selection
  - method-tailoring
  - compatibility-check

optional_skills:
  - algorithm-design
  - formalization
  - rival-explanation
```

---

## 16.2 Prompt Versioning

```text
baseline-selection@1.0.0
baseline-selection@1.1.0

method-tailoring@1.0.0
```

Trace 保存：

```text
model
prompt_version
skill_version
input_artifacts
output_artifact
timestamp
```

---

# 17. User Custom Skill

后续允许：

```text
Built-in Skill
Installed Skill
Project Skill
User Override Skill
```

优先级建议：

```text
Project Override
> User Installed
> Built-in Default
```

默认 Skill 永远保留原版，支持恢复。

---

# 18. Research Entity Model

核心 Entity：

```text
ResearchProject
ResearchBrief

Paper
Evidence
CodeRepository

Problem
Limitation
Hypothesis

Baseline
Module
CandidateIdea
Competitor

Dataset
Metric

BuildSpec

Experiment
Result

Claim
Decision
Failure

Manuscript
```

---

# 19. Entity Status

Lifecycle：

```text
DRAFT
CANDIDATE
SHORTLISTED
ACCEPTED
REJECTED
DEPRECATED
```

Epistemic：

```text
UNKNOWN
PROPOSED
INFERRED
VERIFIED
SUPPORTED
REFUTED
```

示例：

```text
Module B

lifecycle = ACCEPTED
epistemic = PROPOSED
```

代表已经决定实现，但尚未通过实验验证效果。

---

# 20. Relation Graph

MVP 不需要图数据库。

先定义：

```text
EntityRelation {
  from
  relation
  to
  source
}
```

典型：

```text
Paper
  SUPPORTS
Limitation

Limitation
  MOTIVATES
Hypothesis

Hypothesis
  ADDRESSED_BY
Module

Module
  TESTED_BY
Experiment

Experiment
  PRODUCES
Result

Result
  SUPPORTS
Claim
```

---

# 21. Artifact Model

Source of Truth：

```text
Project State + Artifact
```

不是 Chat History。

推荐：

```text
.research-studio/
├── project.json
│
├── entities/
│   ├── baselines/
│   ├── modules/
│   ├── papers/
│   ├── hypotheses/
│   ├── claims/
│   └── ...
│
├── evidence/
│
├── decisions/
│
├── buildspec/
│
├── experiments/
│
├── manuscript/
│
├── prompts/
│
└── traces/
```

MVP：

```text
Filesystem + JSON + Markdown
```

未来再抽象：

```text
Storage Plugin
SQLite
Cloud
Graph Database
```

---

# 22. Decision / Failure Ledger

必须保留研究历史。

```text
Decision
├── decision
├── alternatives
├── reason
├── evidence
├── user / agent
└── timestamp
```

```text
Failure
├── experiment
├── symptom
├── diagnosis
├── evidence
├── resolution
└── backflow
```

拒绝的方案不能删除。

---

# 23. Branch / Pivot

一个 Project 可以存在多个研究路线：

```text
Main
├── Route A
│   └── A+B
├── Route B
│   └── A+C
└── Route C
    └── A+B+C
```

Experiment Failure 可以触发：

```text
PIVOT
```

Pivot 保存：

```text
old_hypothesis
new_hypothesis
trigger_evidence
decision_reason
```

MVP 可以只实现轻量 Branch，不要求完整 Tree Search。

---

# 24. Gate System

默认 Gate：

```text
BRIEF_READY
EVIDENCE_READY
BASELINE_FROZEN
HYPOTHESIS_FALSIFIABLE
MODULE_COMPATIBLE
DESIGN_APPROVED
BUILD_READY
BASELINE_PARITY
EXPERIMENT_EVIDENCE_READY
CLAIM_SUPPORTED
MANUSCRIPT_AUDITED
```

Gate Result：

```text
PASS
PASS_WITH_WARNINGS
FAIL
BLOCKED
```

输出：

```text
reasons
missing
recommended_backflow
```

---

# 25. Context Policy

不同 Stage 只能读取必要内容。

## Baseline Agent

```text
ResearchBrief
Relevant Evidence
Baseline Candidates
Compute Constraints
```

## Module Agent

```text
Problem
Limitation
Hypothesis
Frozen Baseline
Relevant Module Evidence
```

## Experiment Agent

```text
BuildSpec
Method Contracts
Experiment Matrix
Previous Results
```

## Writing Agent

只允许：

```text
Verified Evidence
Supported Claims
Verified Results
Method Artifacts
Reference Library
```

默认禁止：

```text
raw brainstorming
rejected idea as current design
unverified metric
unverified citation
```

---

# 26. Human-in-the-loop

默认需要用户确认：

```text
Research Brief Finalization
Baseline Freeze
Module Accepted
Research Hypothesis
BuildSpec Approval
Main Claim Promotion
Final Manuscript
```

可自动写：

```text
tool logs
experiment output
metrics
trace
temporary draft
```

未来模式：

```text
SAFE
GUIDED
AUTONOMOUS
```

MVP：

```text
GUIDED
```

---

# 27. DSH Plugin Architecture

Research Studio 不直接修改 DSH Core。

推荐：

```text
academic-research-studio/
│
├── core/
│   ├── workflow-registry
│   ├── entity-registry
│   ├── artifact-store
│   ├── relation-store
│   ├── gate-engine
│   └── trace
│
├── skills/
│   ├── builtin/
│   └── adapters/
│
├── workflow/
│   └── mvp-research-preset
│
├── tools/
│   ├── literature/
│   ├── repo/
│   ├── experiment/
│   └── audit/
│
├── dsh-adapter/
│
└── ui/
    └── research-studio
```

实际目录根据开发时 DSH 当前源码结构调整。

---

# 28. DSH Adapter

业务 Domain 不大量直接依赖 DSH 内部实现。

```text
Research Domain
      ↓
DSH Adapter
      ↓
DSH Plugin API
```

Adapter 负责：

```text
skill registration
tool registration
context injection
session event
storage bridge
ui integration
sandbox
```

必须 Pin：

```text
DSH commit SHA
```

避免未来 DSH API 变化影响整个 Research Domain。

---

# 29. Main Loop 策略

MVP 不替换 DSH Main Loop。

先使用：

```text
Standard DSH Loop
      +
Research Workflow Service
      +
Skills
      +
Tools
      +
UI
```

以后再增加：

```text
Research Loop
Tree Search Loop
Parallel Experiment Loop
Multi-Agent Loop
```

State Model 必须为这些能力留接口。

---

# 30. UI RPD

软参考：

```text
research_studio_prototype.html
```

不要求像素级复刻。

---

## 30.1 顶层

```text
Research Brief
Evidence
Research Design
BuildSpec
Experiment
Paper & Audit
```

Stage 由 Registry 动态生成。

---

## 30.2 Stage Page

```text
Stage Header

Object Type Tabs

Object Cards

SubStage Bar

Artifact Editor

Research Tutor

Gate / Review
```

---

## 30.3 Research Design 示例

```text
[Baseline / Base]
[Module B / C]
[References]
[Claims]
```

Card：

```text
Baseline A
Current Main Baseline
Verified / Pending

[打开继续]
[回退重写]
[查看关系]
```

---

# 31. MVP Scope

## P0 — Core

```text
Project Create / Open
Workflow Registry
Stage Registry
Entity Store
Artifact Store
Relation Edge
Skill Registry
Prompt Registry
Gate
Trace
```

---

## P1 — Research Studio

```text
Research Brief
Evidence
Research Design
Tutor
SubStage
Object Cards
Review / Backflow
```

优先支持：

```text
Baseline
Module
Reference
Hypothesis
Claim
```

---

## P2 — BuildSpec + DSH Coding

```text
ResearchDesign
→ BuildSpec
→ DSH Coding Agent
→ Repo Artifact
```

---

## P3 — Experiment Loop

```text
Experiment Definition
Run
Result Capture
Diagnosis
Backflow
Ledger
```

MVP 暂不要求 Tree Search。

---

## P4 — Paper & Audit

```text
Claim Ledger
Outline
Method
Experiment
Audit
```

---

# 32. MVP 非目标

第一版不做：

```text
完整毕业生命周期
自动导师推荐系统
自动 Conference Submission
复杂 Multi-Agent Debate
完整 Tree Search
Neo4j
Cloud Collaboration
多人实时协作
完整 Citation Manager 替代
```

但架构必须允许未来增加。

---

# 33. Future Presets

## ThesisFullPreset

```text
Graduation Goal
Supervisor
Direction
Proposal
Evidence
Research Design
Build
Experiment
Midterm
Paper
Pre-defense
Defense
```

## PaperSprintPreset

```text
Brief
Evidence
Design
Build
Experiment
Paper
Revision
```

## AuditPreset

```text
Existing Research
Evidence Audit
Method Audit
Experiment Audit
Claim Audit
Revision
```

## AutoResearchPreset

```text
Topic
Evidence
Candidate Ideas
Parallel Branches
Experiments
Tree Search
Paper
Reviewer
```

---

# 34. Academic Integrity

系统禁止：

```text
伪造 Citation
伪造实验
伪造结果
把 Proposed 写成 Verified
隐藏负实验
删除不利结果
把模块拼接本身称为创新
把 Mock 当真实 E2E
复制无归属论文文字
虚构论文已投稿 / 已录用
```

核心判断：

```text
verified
inferred
proposed
unknown
rejected
```

需要贯穿整个 Project。

---

# 35. Security

Coding / Experiment 应优先进入 Sandbox。

Secret 不允许进入：

```text
Prompt Artifact
Paper
Trace
Git Commit
Experiment Report
```

例如：

```text
API Key
Token
SSH Key
Credential
```

---

# 36. Acceptance Criteria

MVP 至少完成以下 Demo：

```text
① 创建 Research Project

② Tutor 辅导生成 ResearchBrief

③ 建立 Paper / Evidence

④ 创建多个 Baseline Candidate

⑤ 冻结 Baseline A

⑥ 创建多个 Candidate Idea

⑦ 创建 Module B / C

⑧ Reject 一个不合理 Module

⑨ 建立 Falsifiable Hypothesis

⑩ 生成 BuildSpec

⑪ 交给 DSH Coding Agent

⑫ 保存 Experiment Result

⑬ 实验失败时执行 Diagnosis / Backflow

⑭ Claim 从 PROPOSED → SUPPORTED / REJECTED

⑮ Writer 只消费 Verified Artifact

⑯ Audit 发现 Unsupported Claim
```

满足以上链路即可证明 MVP Domain Model 正确。

---

# 37. 推荐开发顺序

```text
1. Domain Schema

2. Workflow / Stage Registry

3. Artifact / Entity Store

4. Skill Registry

5. Prompt Layer

6. Research Tutor Loop

7. Gate / Backflow

8. Research Design UI

9. DSH Adapter

10. BuildSpec

11. Experiment

12. Writing / Audit
```

第一阶段最小 Demo：

```text
Research Brief
      ↓
Baseline Studio
      ↓
Candidate Idea
      ↓
Module Studio
      ↓
Hypothesis
      ↓
Design Review
```

只要：

```text
状态
对象
Tutor
SubStage
Skill
Gate
回退
```

全部成立，后续 Coding / Experiment 可以继续增加而无需改 Core。

---

# 38. Reference Index — Workflow / Product

以下仅作为设计软参考，不要求复刻。

| 项目 | 链接 | 借鉴内容 |
|---|---|---|
| Research Studio Prototype | `research_studio_prototype.html` | 顶层 Stage、Object Tabs、对象卡片、SubStage、Tutor、Gate 的 UI 心智模型 |
| 万象角色引擎 / PERSONA ENGINE | https://github.com/ericfu66/PERSONA-ENGINE-SILLYTAVERN | 顶层工作流、对象内部子流程、多实例对象、可选步骤、回退编辑、Prompt 定制 |
| 万象 Studio | https://www.xieka.icu/studio/ | Studio 式阶段导航与创作进度管理 |
| AI Scientist | https://github.com/SakanaAI/AI-Scientist | Idea → Experiment → Paper 的自动科研闭环 |
| AI Scientist-v2 | https://github.com/SakanaAI/AI-Scientist-v2 | Candidate Idea、分支实验、Tree Search / Agentic Experimentation |
| Zochi | https://github.com/IntologyAI/Zochi | 从现有 Baseline Repository 出发继续科研与真实工程修改 |
| QUIT | https://github.com/Mr-XcHan/QUIT | Artifact-driven、ResearchBrief、EvidenceCards、IdeaLibrary、BuildSpec、Run Trace、HITL |
| Agent Laboratory | https://github.com/SamuelSchmidgall/AgentLaboratory | Literature / Experiment / Writing 专项科研角色 |
| Denario | https://github.com/AstroPilot-AI/Denario | 模块化 Multi-Agent 科研流程与可组合 Research Agent |
| STORM / Co-STORM | https://github.com/stanford-oval/storm | 多视角文献检索、问题拆解、Outline、Citation-aware synthesis |
| PaperClaw | https://github.com/ZyfNO2/PaperClaw | 本项目原生 Coding Agent / Research Runtime 参考 |
| PaperAgent | https://github.com/ZyfNO2/PaperAgent | 外部工作流编排与论文创新点流程参考 |
| DeepSeek Harness | https://github.com/deepseek-ai/deepseek-harness | Plugin / Tool / Skill / Runtime 宿主与插件实现目标 |

---

# 39. Reference Index — Research Skills

这些仓库用于 **借鉴 Skill 划分、Prompt Contract、科研 Gate 和审查方法**。
不要求原样安装全部 Skill。

| Skill Repository | 链接 | 主要借鉴 |
|---|---|---|
| agent-research-skills | https://github.com/lingzhi227/agent-research-skills | Literature、Idea、Novelty、Experiment、Data Analysis、Self Review、Backward Trace 等完整科研 Skill 分类 |
| research-paper-lifecycle-skills | https://github.com/ShaishavMaisuria/research-paper-lifecycle-skills | Citation、Venue、Submission、Revision、Rebuttal、Preflight 等论文生命周期 Skill |
| Academic Research Agent Skill | https://github.com/ngtiendong/Academic-Research-Agent-Skill | Human-guided Research、Novelty Gate、Experiment Planning、Reviewer Simulation、Claim Verification |
| DeerFlow Systematic Literature Review | https://github.com/bytedance/deer-flow/blob/main/skills/public/systematic-literature-review/SKILL.md | 系统性文献检索、跨论文结构化综合、文献 Artifact |
| DeerFlow Academic Paper Review | https://github.com/bytedance/deer-flow/blob/main/skills/public/academic-paper-review/SKILL.md | 单论文 Method / Contribution / Evaluation 审查 |
| Research Paper Review Skill | https://github.com/chunhualiao/paper-review-skill | 最终同行评审、方法批判、Claim/数字一致性、审稿 Artifact |
| Local Academic Method Tailoring | `学术裁缝核心方法论.txt` | Baseline Freeze、A+B+C、Compatibility、Falsifiable Hypothesis、Ablation、GO/REVISE/NO-GO |

---

# 40. Stage → Skill Reference Mapping

| Stage | MVP Default Skill | 后续可选 |
|---|---|---|
| Research Brief | research-planning / problem-formulation | supervisor-fit / venue-targeting |
| Evidence | literature-search / literature-review / evidence-extraction / citation-verification | systematic-review / deep-research / figure-table |
| Research Design | idea-generation / novelty-assessment / baseline-selection / method-tailoring / compatibility-check | algorithm-design / formalization / rival-explanation |
| BuildSpec | github-research / paper-to-code / implementation-planning / code-debugging | architecture-review / test-planning |
| Experiment | experiment-design / ablation-design / failure-analysis / reproducibility / data-analysis | statistical-test / robustness / efficiency / backward-trace |
| Paper & Audit | claim-verification / paper-writing-section / self-review / research-paper-review | citation-management / revision / rebuttal / preflight / defense |

---

# 41. Final Architecture Summary

```text
Research Studio
│
├── Workflow Preset
│   └── Stage Registry
│
├── Research Entities
│   ├── Baseline
│   ├── Module
│   ├── Paper
│   ├── Evidence
│   ├── Hypothesis
│   ├── Experiment
│   └── Claim
│
├── Research Tutor
│
├── Skill Registry
│   ├── Built-in
│   ├── Optional Pack
│   └── User Skill
│
├── Artifact Store
│
├── Relation Graph
│
├── Gate / Backflow
│
├── DSH Adapter
│
├── Coding / Experiment Tools
│
└── Research Studio UI
```

最终设计目标：

> **用万象式 Studio 交互组织研究对象，用科研 Skill 提供阶段方法，用 Artifact 与 Gate 保证研究状态，用 DSH 完成 Coding 与真实实验，并以 Evidence → Claim 的链路约束论文写作。**
