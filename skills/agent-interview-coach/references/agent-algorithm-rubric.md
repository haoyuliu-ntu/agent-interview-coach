# Agent 算法 / 评测 / 后训练高频深水区追问清单

在做模式 A 源码审计或模式 B 算法向追问时，结合候选人简历与技术报告深挖以下维度：

## 1. Agent 评测体系（Evaluation — 面试必考第一关）
- **评测维度拆解**：不能只说“人工看了觉得不错”或“准确率 85%”。必须拆清：
  - **端到端结果指标**：Task Success Rate / Pass@1 / Pass@k / F1 / 业务转化；
  - **过程轨迹指标（Trajectory Eval）**：工具选择准确率、参数提取准确率、平均步数（冗余步数/死循环率）、过早放弃率、拒答准确率（该拒答时是否拒答）；
  - **效率与安全指标**：P50/P95 延迟、单任务平均 Token 成本、越权/幻觉率。
- **评测集构造与防泄漏**：Golden Set 怎么来的（线上真实日志抽样 + 难例挖掘 + 对抗样本）？覆盖了哪些长尾场景？训练集与评测集如何严格去重防数据泄漏？
- **LLM-as-a-Judge 可靠性**：Judge 模型本身有偏置（长度偏置、位置偏置、自我偏好），怎么校准（与人工标注算 Cohen's Kappa / Spearman 相关系数、pairwise 交换顺序、拆解成细粒度二元 Rubric Check）？

## 2. Prompt / Workflow vs 后训练（SFT / RL）的边界判断
- **什么时候不该微调**：需求未稳定、靠 Context Engineering / Few-shot / 工具描述优化 / 换强模型就能解决的问题，盲目 SFT 反而会损伤通用推理与指令遵循能力（灾难性遗忘）。
- **什么时候值得做 SFT / RL**：高频垂直工具调用格式、特定领域规划范式、延迟/成本受限需要把大模型能力蒸馏到小模型（7B/14B/32B）、或者靠可验证环境反馈做多步 RL 提升复杂任务上限。

## 3. 轨迹数据构造与 SFT（Trajectory Synthesis & Distillation）
- **数据来源与清洗**：如何从强模型采样（Rejection Sampling / Best-of-N）收集成功轨迹？怎么过滤“结果碰巧对但推理/工具调用绕远路或作弊”的伪正样本？
- **负样本与自纠错能力**：只训一帆风顺的轨迹会导致模型遇到工具报错就崩；是否构造了“工具报错 → 读错误信息 → 修正参数重试”的恢复轨迹？
- **Loss Masking 细节**：多轮 Agent 轨迹训练时，**Tool Return（环境观测输出）与 User Prompt 必须 mask 掉不计入 loss**，只对 Assistant 的 Thought / Tool Call / Final Answer 算 loss——为什么？不 mask 会怎样？

## 4. 强化学习与偏好对齐（DPO / GRPO / Agentic RL）
- **Reward 设计与防 Reward Hacking**：
  - 优先用可验证的结果奖励（Outcome / Verifiable Reward：单测通过、SQL 执行匹配、状态检查）+ 格式奖励（Format Reward）；
  - 过程奖励（PRM）vs 结果奖励（ORM）的取舍：多步长轨迹信用分配（Credit Assignment）怎么处理？如何防止模型刷步数或输出冗长废话骗分？
- **算法选型与训练稳定性**：DPO（离线偏好对，容易 distribution shift）vs PPO / GRPO（在线采样，去掉 Critic 省显存但依赖组内方差与环境吞吐）；多轮交互环境 rollout 瓶颈怎么加速（异步环境池、并发沙箱、长度截断处理）？
- **消融实验（Ablation）**：简历里如果写了“效果提升 X%”，到底多少来自数据清洗、多少来自 Prompt、多少来自 SFT、多少来自 RL？能不能讲清对比 Baseline？

## 5. 推理加速与部署（如简历涉及本地模型/私有化）
- **KV Cache 与 Prefix Caching**：多轮 Agent 每轮只追加少量新工具输出，前缀高度复用——推理引擎（vLLM / SGLang RadixAttention）如何复用 KV Cache 降低 TTFT？
- **结构化输出约束**：Constrained Decoding（Outlines / xgrammar / Guided JSON）如何保证 100% 合法 Tool Call JSON，以及它对推理吞吐和模型思维链质量的潜在影响。
