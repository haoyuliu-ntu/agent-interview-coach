# Agent 应用开发 / 工程架构高频深水区追问清单

在做模式 A 源码审计或模式 B 面试追问时，按项目实际涉及的模块选取对应维度深挖：

## 1. Agent 编排与控制流（Orchestration）
- **架构选型**：Workflow（确定性 DAG / 状态机）vs Autonomous Agent（ReAct / Plan-and-Execute）vs Multi-Agent（Supervisor / Swarm / Handoff）。为什么选当前形态？Multi-Agent 是否真的比单 Agent + 多工具更好（上下文交接损耗、延迟叠加、错误放大）？
- **终止与防死循环**：`max_steps` / token budget / 重复工具调用检测（loop detection）怎么写？触发上限后是优雅降级总结，还是直接报错？
- **状态持久化与断点恢复**：长任务中途进程崩溃、网络断连或需要 Human-in-the-Loop（人工审批）时，checkpoint 怎么存、幂等性怎么保证？

## 2. 工具调用（Function Calling / MCP）
- **Schema 设计与容错**：工具描述怎么写才能减少选错工具？模型输出非法 JSON / 缺必填字段 / 幻觉参数值时，怎么校验（Pydantic / JSON Schema）并把错误信息回喂给模型自修复？重试几次后熔断？
- **安全与权限边界**：执行代码、SQL、Shell、写文件、外部 HTTP 请求时怎么做沙箱隔离、只读/写权限分级、高危操作二次确认、防止 Prompt Injection 诱导越权调用？
- **并发与超时**：多个独立工具调用是否支持并行（Parallel Tool Calls）？单个慢工具阻塞整条链路时如何设置超时、取消与部分结果返回？

## 3. 上下文工程与记忆（Context & Memory）
- **上下文窗口管理**：工具返回超长输出（如大日志、长网页）怎么截断/摘要/按需检索（Tool Output Offloading）？多轮对话快满窗口时，用滑动窗口、分层摘要还是关键事实提取（Compaction）？如何防止压缩后丢失用户的初始硬约束？
- **长短期记忆**：短期工作记忆 vs 跨会话长期记忆（Profile / Episodic / Semantic）怎么存、怎么检索、冲突记忆怎么更新/过期淘汰？
- **RAG 与检索增强**：切分策略（固定长度 / 语义 / 结构化）、混合检索（BM25 + Dense Vector + RRF）、Rerank、Query 改写/路由；检索为空或召回低相关内容时如何避免硬编？

## 4. 延迟、成本与线上稳定性（Production Readiness）
- **延迟优化**：TTFT（首字延迟）和端到端耗时瓶颈在哪？流式输出（SSE/WebSocket）、投机/并行工具调用、大小模型路由（Router：简单意图走轻量模型，复杂规划走旗舰模型）、Prompt Prefix Caching 命中率怎么保障（固定系统提示词在前、动态变量放后）？
- **可观测性与排查**：一次多步 Agent 执行出错，怎么通过 Trace ID 还原每一步的完整 Input/Prompt/Thought/Tool Args/Tool Output/Token/Latency？
- **限流与降级**：上游 LLM API 429/500/超时时，指数退避重试、多供应商/多模型 Fallback 怎么设计？如何防止重试引发重复扣费或副作用？
