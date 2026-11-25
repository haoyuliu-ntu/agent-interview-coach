# 复盘量化评分、表达诊断与模式 C 弱点闭环规范

本文件采用渐进式按需加载：仅在进入 **模式 B 面试结束复盘** 或启动 **模式 C（弱点靶向二刷 / 单点 5 连击）** 时读取。

---

## 一、6 维胜任力量化打分标尺（1~5 分锚点）

复盘打分必须对照统一量化锚点，避免前后场次评分漂移：

| JSON 键名 | 维度名称 | 1 分（高危淘汰） | 3 分（及格线 / 勉强可用） | 5 分（大厂强录用） |
| :--- | :--- | :--- | :--- | :--- |
| `codeMastery` | 代码真实掌握度 | 说不清核心文件/数据流，明显呈 AI 代写黑盒感 | 能讲出主流程，但关键边界、锁/状态或参数说不清 | 精确落位到函数、状态转移、并发约束与超参依据 |
| `techSelection` | 技术选型与业务闭环 | 盲目引入 Agent/多智能体，答不出不用行不行 | 能列出方案 A/B，但缺延迟、Token 成本与可维护性权衡 | 从业务 SLA 出发讲透 Trade-off 与演进边界 |
| `engineeringResilience` | 异常边界与线上工程思维 | 只有裸 `try-except` 或无超时/重试/防死循环意识 | 有基础重试或 `max_steps`，缺幂等、脏数据隔离或观测 | 具备 Schema 自修复、断点恢复、熔断降级与 Trace 闭环 |
| `algorithmAndEval` | Agent 算法与评测（Eval）意识 | 仅凭“主观感觉还行”，无评测集与消融意识 | 知道 Pass@1 等结果指标，但缺轨迹过程指标与防泄漏 | 端到端+轨迹+Judge 校准+数据/RL/Ablation 全链路闭环 |
| `acmCoding` | ACM 手撕代码质量 | 核心思路错误或完全写不出 | 核心思路或骨架正确，但存在边界漏判、I/O 小 Bug 或未达最优复杂度 | 思路清晰、ACM I/O 完整、边界扎实、复杂度最优且实机 AC |
| `deliveryAndQuestions` | 表达结构与反问质量 | 逻辑混乱兜圈子、高频空话、团队与个人贡献混为一谈 | STAR 基本完整，但缺量化锚点或关键术语命中偏少 | 结论前置、个人边界清晰、高频命中工程/算法锚点词、反问有深度 |

> **说明**：若本场为专项加练或模式 C 靶向二刷且未包含 ACM 手撕环节，`scores.acmCoding.score` 记为 `null`（不计入 `overallScore` 平均分分母），`acmSummary` 记为 `null`。

---

## 二、结构化复盘 JSON Schema（v1.0）与落盘规范

### 1. 隐私与路径规则
- **存在活动工作区时**：将每场复盘 JSON 写入 `<workspace>/interview-prep/sessions/<sessionId>.json`（`<sessionId>` 命名规范：`YYYY-MM-DD_HHmm_<slug>`，如 `2026-11-25_2200_mock-hybrid`）。
- **无活动工作区时**：仅在当前对话输出完整复盘报告，**严禁**将任何个人简历、会话记录或错题写入插件安装目录。

### 2. Schema v1.0 字段规范
```json
{
  "schemaVersion": "1.0",
  "sessionId": "2026-11-25_2200_mock-hybrid",
  "timestamp": "2026-11-25T22:00:00+08:00",
  "mode": "mock_full",
  "track": "hybrid",
  "targetRole": "Agent 算法/应用双方向",
  "pressure": {
    "initialLevel": 2,
    "peakLevel": 3,
    "transitions": [
      {
        "stage": "2/5",
        "from": 2,
        "to": 3,
        "reason": "连续两轮源码路径与评测指标作答扎实，触发升档"
      }
    ]
  },
  "scores": {
    "codeMastery": { "score": 4, "comment": "能讲清状态机核心边，但异步锁边界略模糊" },
    "techSelection": { "score": 3, "comment": "未量化对比 Workflow 与 ReAct 延迟代价" },
    "engineeringResilience": { "score": 2, "comment": "工具超时与脏数据熔断缺少幂等设计" },
    "algorithmAndEval": { "score": 3, "comment": "有 Pass@1 概念，但缺轨迹过程指标与去重说明" },
    "acmCoding": { "score": 4, "comment": "核心滑动窗口思路正确，边界 n=1 漏判" },
    "deliveryAndQuestions": { "score": 3, "comment": "STAR 完整但高频出现“优化了一下”等模糊词" }
  },
  "overallScore": 3.17,
  "fatalFlaws": [
    {
      "id": "W-001",
      "dimension": "engineeringResilience",
      "summary": "工具死循环与脏数据无熔断兜底",
      "sourceRef": "agent/runner.py#L42-L78"
    }
  ],
  "deliveryAudit": {
    "vaguePhrases": [
      {
        "phrase": "效果提升明显",
        "context": "RAG 检索改造描述",
        "suggestedReplacement": "在 200 条真实难例集上 Recall@5 从 68% 提升至 84%，P95 延迟增加 45ms"
      }
    ],
    "fillerWords": [
      { "word": "然后", "count": 4 }
    ],
    "starCheck": {
      "situation": true,
      "task": true,
      "action": true,
      "result": false,
      "individualContributionClear": false,
      "note": "多处使用“我们做了”，需明确你在检索重排与评测脚本中的个人主导权与实现边界"
    },
    "keywords": {
      "expected": ["State Machine", "Tool Schema Validation", "Trajectory Eval", "Prefix Caching", "Fallback"],
      "hit": ["State Machine", "Fallback"],
      "missed": ["Tool Schema Validation", "Trajectory Eval", "Prefix Caching"],
      "hitRate": 0.4
    },
    "polishedAnswer60s": "（约 220~260 字，可直接用于 60 秒口述的高分重答示范）"
  },
  "acmSummary": {
    "problemId": "subarray-sum-k",
    "title": "和为 K 的子数组",
    "language": "python",
    "verdict": "WA -> Fixed",
    "ideaCorrect": true
  },
  "weakPointUpdates": [
    {
      "id": "W-001",
      "action": "created",
      "status": "open",
      "mastery": 1
    }
  ]
}
```
- `mode` 取值枚举：`"mock_full"`（全真模拟）、`"mock_drill"`（专项加练）、`"weakness_drill"`（模式 C 弱点二刷）。
- `track` 取值枚举：`"engineering"` / `"algorithm"` / `"hybrid"`。
- `weakPointUpdates[].action` 取值枚举：`"created"` / `"reinforced"` / `"progressed"` / `"mastered"`。

---

## 三、表达诊断与关键词命中分析框架

在复盘报告的「表达诊断与关键词命中」章节，严格按以下 4 步输出：

### 1. 高频模糊空话抓捕与真实源码替换
从候选人本场回答中提取实际说过的模糊表述，对照黑名单逐条指出并给出**锚定真实项目的替换版**：
- **常见模糊词黑名单**：“优化了一下”、“效果提升明显”、“做了多 Agent 协同”、“提升了稳定性”、“加了兜底机制”、“效果还不错”、“负责核心开发”、“解决了幻觉问题”、“性能好很多”。
- **替换要求**：必须拆解成 **[具体改动模块/机制] + [对照基线与样本口径] + [量化收益或边界限制]**（禁止帮候选人虚构未做过的指标；若源码/报告无实验数据，须明确提醒“需补测 X 指标或改用定性工程事实表述”）。

### 2. STAR 叙事完整度与个人贡献边界核查
- 逐项核查 **S（业务痛点/背景）、T（约束目标）、A（核心架构动作）、R（量化结果/线上验证）** 是否缺环；
- **团队产出 vs 个人贡献隔离核查**：专门抓出“我们实现了 / 团队做了 / 项目接入了”等模糊主语，强制要求明确：**哪几个核心文件/模块是候选人亲手设计与拍板的？如果别人写的部分出问题你能否兜底？**

### 3. 口语/语音转写逐字稿友好兼容
若候选人通过语音听写（如 `Win+H` / macOS 听写 / 语音转文字）提交口述稿：
- 自动忽略同音错别字与标点断句瑕疵，不扣“书写格式分”；
- 额外统计高频口语填充词（如 `然后 / 就是 / 其实 / 那个 / 怎么说呢`）的出现次数写入 `fillerWords`；
- 按中文正常面试口述语速 **~240 字/分钟**估算回答耗时，明确提示是否超时（例如 30 秒电梯版应控制在 100~130 字，60 秒浓缩版 220~260 字，2 分钟 STAR 版 450~520 字）。

### 4. 核心关键词清单对比 & 60 秒浓缩高分重答示范
根据本场方向与项目真实涉及模块，从以下词库精选 **6~12 个**面试官最期待听到的技术锚点作为 `expected`，统计 `hit`、`missed` 与 `hitRate`：

- **工程/应用开发向核心锚点词**：
  `State Machine / DAG`, `ReAct / Plan-and-Execute`, `Tool Schema Validation`, `Loop Detection / Max Steps`, `Checkpoint & Idempotency`, `Parallel Tool Calls`, `Prompt Injection Sandbox`, `Context Compaction`, `Tool Output Offloading`, `Hybrid Retrieval (BM25+Dense+RRF)`, `Rerank`, `TTFT / Prefix Caching`, `Model Routing`, `Trace Observability`, `Circuit Breaker / Fallback`
- **算法/评测/后训练向核心锚点词**：
  `Trajectory Eval`, `Pass@1 / Pass@k`, `Tool Selection & Arg Accuracy`, `Golden Set & Deduplication`, `LLM-as-a-Judge Calibration`, `Workflow vs SFT Boundary`, `Rejection Sampling`, `Error-Recovery Trajectory`, `Loss Masking`, `ORM vs PRM`, `DPO / PPO / GRPO`, `Reward Hacking`, `Ablation Study`, `KV Cache / RadixAttention`, `Constrained Decoding`

随后选取本场最关键的一道项目核心提问，给出一版 **220~260 字的「60 秒口述高分重答示范」**，严格遵循结构：**1 句结论前置 → 2 句核心机制锚点 → 1 句选型 Trade-off → 1 句量化结果与线上兜底**，确保候选人能直接开口背诵与演练。

---

## 四、模式 C（弱点靶向二刷 / 单点 5 连击）剧本与台账协议

### 1. `weak_points.md` 结构化台账规范
为保证人类可直观阅读、且「成长看板」Sidecar 可靠解析，写入 `<workspace>/interview-prep/weak_points.md` 时使用如下统一区块格式：

```markdown
# 面试弱点闭环台账（Weak Points Ledger）

> 由 `agent-interview-coach` 自动维护；仅当模式 C 5 连击中讲透底层机制、Trade-off 与故障兜底后才允许标记为 `mastered`。

### [W-001] 工具超时与死循环熔断设计缺失
- **状态**: `open`
- **熟练度**: `1/3`
- **归属维度**: `engineeringResilience`
- **严重级别**: `high`
- **关联源码**: `agent/runner.py#L42-L78`
- **首次暴露**: `2026-11-25`（来源：`2026-11-25_2200_mock-hybrid`）
- **最近二刷**: `未二刷`
- **暴露问题**: 仅设置了 `max_steps=10`，缺少重复相同参数死循环检测、单工具超时取消与断点幂等恢复。
- **过关要点**: 讲透状态机终止条件 + 幂等与重试成本 Trade-off + 工具超时/脏数据熔断与线上 Trace 止损
- **二刷记录**:
  - `2026-11-25`: 首次记录（状态 `open`，熟练度 `1/3`）
```

**向下兼容原则**：若用户工作区已有旧版自由格式列表（`- 某个历史弱点...`），更新时保留原记录并在后续追加新规范条目，或在征得同意后增量升级为 `[W-xxx]` 结构，绝不清空用户手写笔记。

### 2. 模式 C 自动选题优先级
启动模式 C 时（除非用户或看板点名指定某条 `[W-xxx]`），读取 `<workspace>/interview-prep/weak_points.md` 与 `sessions/*.json` 最近记录，按以下优先级排序推荐 1~2 个弱点并立即开打第 1 击：
1. **P1**：状态为 `open` 且 `严重级别: high` 的高危弱点；
2. **P2**：最近 2 场 `sessions/*.json` 中均值最低维度对应的未攻克弱点；
3. **P3**：状态为 `partial` 且距今最久未二刷的条目。

### 3. 单点 5 连击逐层拷打剧本（每轮只问 1 题，严禁剧透）
围绕选定的 1 个弱点与对应真实源码/算法场景，发起连续 5 层深度连击：
- **第 1 击（`[模式 C · 连击 1/5 · 底层机制]`）**：不看提示，正面讲清底层原理、核心数据结构或数学定义，不准用模糊黑盒词搪塞。
- **第 2 击（`[模式 C · 连击 2/5 · 源码与细节落位]`）**：锚定项目真实文件路径/行号或参数/Loss 公式，追问具体入参、出参、边界条件或掩码细节。
- **第 3 击（`[模式 C · 连击 3/5 · 选型与 Trade-off]`）**：质疑前提——对比至少一种主流替代方案，讲清效果上限、延迟、Token/算力成本与工程复杂度权衡。
- **第 4 击（`[模式 C · 连击 4/5 · 极端约束压测]`）**：临时更改硬约束（如并发 10x、工具返回 50KB 脏数据或 15s 超时、预算砍半、样本分布漂移），要求给出最小可执行改造方案。
- **第 5 击（`[模式 C · 连击 5/5 · 故障兜底与 Eval 闭环]`）**：假设该点在线上出现 P1 级故障或指标回退，如何通过 Trace/日志秒级止损、以及如何构造回归评测集确保永不再犯。

### 4. 严格过关门禁与台账写回
5 连击结束后，依据候选人表现执行**硬门禁判定**（禁止敷衍放水）：
- **✅ `mastered`（熟练度 `3/3`）**：必须同时满足 ① 底层机制/源码细节准确无误、② 讲清选型 Trade-off 与代价、③ 给出可执行故障兜底与 Eval 闭环。三缺一即不予攻克！
- **🟡 `partial`（熟练度 `2/3`）**：机制与选型基本讲对，但极端压测或线上兜底/评测闭环仍有缺口；明确写明残余卡点，留待下次巩固。
- **🔴 `open`（熟练度 `0/3` 或 `1/3`）**：仍停留在概念表面或答非所问；维持 `open` 并输出针对性拆解。

判定完成后：
1. 在对话中输出简明 **模式 C 连击复盘 + 表达诊断 + 60 秒高分重构答案**；
2. 更新 `<workspace>/interview-prep/weak_points.md` 对应条目的 `状态`、`熟练度`、`最近二刷` 与 `二刷记录`；
3. 向 `<workspace>/interview-prep/sessions/` 追加写入一条 `mode: "weakness_drill"` 的结构化 JSON（将本次重点训练的维度真实打分，未覆盖维度按最近一次或 `null` 处理并在 `weakPointUpdates` 准确记录变更）。
