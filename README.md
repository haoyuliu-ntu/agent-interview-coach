# Agent Interview Coach & ACM Workbench (`agent-interview-coach` v2.0)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)]()

一款面向 **Google Antigravity** 的零外部依赖原生插件（Skill + Sidecar），专为求职 **中国互联网大厂 / AI 独角兽 Agent 算法工程师 & Agent 应用开发工程师** 打造，覆盖完整的实战备考闭环：

> **源码红绿灯排雷 → 动态三档压力模拟面 → 表达诊断与结构化沉淀 → 弱点靶向 5 连击二刷 → 6 维成长曲线追踪**

---

## 核心功能

### 1. 模式 A：简历与源码深度排雷（Deep-Dive & Defense Cards）
- **简历 vs 源码红绿灯审计**：
  - 🔴 **高危雷区**：识别简历夸大、源码实现极简或指标口径模糊的地方，给出稳妥改法或最小补齐方案；
  - 🟡 **AI 协作黑盒区**：定位 AI 帮你写进代码的关键参数、Prompt、状态机与工具校验逻辑（精确到文件与行号），用人话讲透；
  - 🟢 **可放大亮点**：提炼最值得主动引导面试官追问的核心技术点。
- **四维面试防御卡**：覆盖面试官必问四刀——**底层实现（What & How） / 选型权衡（Why & Trade-off） / 反事实推演（What if NOT） / 线上故障与评测闭环（Failure & Fix）**。
- **口述压缩版**：提供 30 秒电梯版与 2 分钟 STAR 详版话术。

### 2. 模式 B：大厂全真动态压力模拟面（Adaptive CN Mock Interview）
- **5 阶段真实节奏**：`[1/5 自我介绍]` → `[2/5 项目深度拷打]` → `[3/5 八股与场景设计]` → `[4/5 ACM 模式手撕代码]` → `[5/5 反问与复盘]`。
- **3 档压力模式 & 动态自适应升降档**：
  - `Lv.1 友好热身` / `Lv.2 标准一面（默认）` / `Lv.3 高压压力面`（支持开场指定或全程锁定）；
  - 每轮开头标注状态头（如 `[阶段 2/5 · 高压追问 Lv.3 ↑]`），连续 2 轮扎实自动升档，连续 2 轮明显卡壳自动回落；
  - 在 `Lv.2` 末层与 `Lv.3` 启用三大真实施压战术（专业克制、锚定源码）：**质疑技术前提**、**临场变更硬约束（并发 10x / 脏数据超时 / 预算砍半）**、**兜圈子果断打断拉回细节**。
- **双方向专业追问库（渐进式按需加载）**：
  - 工程向（[agent-engineering-rubric.md](skills/agent-interview-coach/references/agent-engineering-rubric.md)）：编排控制流、Function Calling / MCP 容错、上下文与记忆压缩、RAG、延迟与成本优化；
  - 算法向（[agent-algorithm-rubric.md](skills/agent-interview-coach/references/agent-algorithm-rubric.md)）：Trajectory Eval 轨迹评测、Prompt/Workflow vs SFT/RL 边界、轨迹清洗与 Loss Masking、GRPO/DPO/Reward Hacking、Prefix Caching 与结构化解码。
- **严禁剧透 + 3~5 层链式追问**：每次只抛 1 个核心问题，结合真实源码深挖。

### 3. 表达诊断与关键词命中分析（Delivery, STAR & Keyword Feedback）
每次复盘自动加载 [evaluation-and-delivery.md](skills/agent-interview-coach/references/evaluation-and-delivery.md)，输出：
- **高频模糊空话定位与替换**：精准抓出“优化了一下”“效果提升明显”“做了协同”等空话，对照真实项目源码拆解为具象改动动作、基线与量化指标；
- **STAR 与个人贡献边界核查**：重点识别是否用“我们做了”掩盖了个人核心实现边界；
- **核心锚点词命中对比**：按工程/算法方向给出面试官期待关键词清单、实际命中率与漏掉的高价值术语；
- **60 秒口述高分重答示范**：直接提炼约 220~260 字的浓缩示范稿，方便开口跟读演练；
- **口语/语音听写逐字稿友好兼容**：忽略听写断句与同音瑕疵，额外检测口语填充词密度并按 ~240 字/分反推预估口述时长。

### 4. 模式 C：弱点靶向二刷 / 单点 5 连击（Weakness Drill Loop）
- 自动读取工作区 `interview-prep/weak_points.md` 与历史 `sessions/*.json` 低分项（优先打 `未攻克高危 > 近期最低分维度 > 久未巩固`）；
- 围绕单个漏洞连续发起 **5 层高压拷打**：`底层机制还原` → `源码/数学落位` → `选型 Trade-off` → `极端约束压测` → `线上故障与 Eval 闭环`；
- **严格过关门禁**：只有讲透**底层机制 + Trade-off + 故障兜底与评测闭环**三项，才允许把状态更新为 `mastered`（`3/3`），否则记为 `partial` 或维持 `open`，并同步追加一条 `weakness_drill` 复盘 JSON。

### 5. 原生「面试工作台（ACM 白板 & 成长看板）」Sidecar
保留原有 `acm_board` Sidecar 入口并升级为双标签暗黑实战工作台（纯原生 Node.js + 原生 SVG，零第三方依赖）：
- **💻 ACM 手撕白板**：
  - 支持右侧辅栏、左侧全屏视图及一键 **「⛶ 居中大窗」**（Windows / macOS / Linux 跨平台支持）；
  - 纯 ACM 题面体验与 20:00 倒计时，支持 Python 3 / JavaScript (Node) / C++ 17 本地试运行与一键提交评审；
  - 坚持 **「读代码判思路、优先肯定」**：即使存在语法笔误或 I/O 小 Bug，只要核心思路正确先明确肯定，再实机给出 `AC/WA/TLE/RE` 排错与最小修复。
- **📊 成长与弱点看板**：
  - 自动感知当前 Antigravity 备考工作区下的 `interview-prep/` 数据（独立浏览器打开也支持手动填写路径加载）；
  - 展示 **4 项关键 KPI**、**6 维胜任力 SVG 雷达图（支持叠加对比上一场或历史均值）**、**跨场次成长折线图（带压力档 Lv.N 标注）**、**短板排序 & 高频模糊词统计**；
  - 错题台账支持按 `未攻克 / 部分掌握 / 已攻克` 筛选，点击任意条目上的 **「🔥 发起 5 连击二刷」** 可一键直发当前对话启动模式 C。

---

## 工作区数据持久化与隐私安全边界

所有求职者个人备考资产（简历、源码、防御卡、结构化复盘 JSON、错题台账）**严格仅落盘在用户的备考工作区**，绝不污染插件源码目录（且插件 `.gitignore` 已强制屏蔽相关目录）：

```text
<你的备考工作区>/
├── resume/                                         # 你的简历
├── repos/                                          # 待审计的项目源码
└── interview-prep/                                 # 插件沉淀的个人备考资产
    ├── sessions/
    │   └── 2026-11-25_2200_mock-hybrid.json        # 单场 v1.0 结构化复盘 JSON
    ├── weak_points.md                              # 结构化弱点闭环台账（兼容旧版自由列表）
    └── <project>-defense.md                        # 模式 A 四维防御卡
```

---

## 语音流 / 语速检测能力边界说明

出于对 **Antigravity Sidecar 沙箱边界** 与 **零外部重依赖原则** 的尊重：
1. Antigravity Sidecar 运行在宿主隔离的跨源 `iframe` 中，默认未透传麦克风权限；且引入本地离线 ASR（如 `whisper.cpp` / `ffmpeg`）会大幅增加体积与环境配置门槛，因此本插件在当前版本不内嵌原生音频流采集或离线 ASR。
2. **推荐零成本口述训练流**：直接使用 Windows `Win + H`、macOS 听写或手机语音转文字将你的口述答案输入对话，模式 B/C 复盘会自动兼容口语逐字稿并分析口语填充词、语速预估耗时与关键词命中率。
3. **P2 可选扩展方向**：未来若需“真实开口计时与停顿卡顿监测”，将在 Popout 独立浏览器窗口中采用纯浏览器原生 Web Audio API 做纯本地音量门限检测（VAD，不录音不上传），继续维持零外部依赖。

---

## 快速安装

### Windows (PowerShell)
```powershell
git clone https://github.com/haoyuliu-ntu/agent-interview-coach.git "$env:USERPROFILE\.gemini\config\plugins\agent-interview-coach"
```

### macOS / Linux
```bash
git clone https://github.com/haoyuliu-ntu/agent-interview-coach.git ~/.gemini/config/plugins/agent-interview-coach
```

克隆完成后重启一次 Antigravity（或在 **Skills & Customizations** 中启用 **Agent 面试教练 & ACM 白板**）即可生效。

---

## 推荐实战使用姿势

1. 在本地新建备考工作区（如 `Agent-Interview-Prep/`），放入 `resume/`、`repos/`、`reports/`，并在 Antigravity 中设为当前项目；
2. **先做排雷**：
   > 使用 `agent-interview-coach` 进入模式 A，结合我工作区里的简历和源码做红绿灯排雷，并为第 1 个项目生成四维面试防御卡。
3. **再做动态压力模拟面**：
   > 使用 `agent-interview-coach` 进入模式 B，按中国大厂 60 分钟全真动态压力面（Lv.2 起步，含 ACM 手撕白板）对我进行综合模拟面试。
4. **看看板 + 针对性 5 连击二刷**：
   > 打开左侧或对话中的「面试工作台」切到成长看板，查看 6 维雷达与短板，或直接发送：使用 `agent-interview-coach` 进入模式 C，对我的最高危弱点发起 5 连击二刷。

---

## 目录结构

```text
agent-interview-coach/
├── plugin.json                                     # Antigravity 插件清单 (v2.0.0)
├── .gitignore                                      # 运行时文件与个人隐私资产隔离规则
├── README.md                                       # 插件使用与架构文档
├── LICENSE
├── skills/
│   └── agent-interview-coach/
│       ├── SKILL.md                                # 核心三模式（A/B/C）精简路由与铁律
│       └── references/
│           ├── cn-interview-playbook.md            # 中国大厂 60 分钟流程、ACM 规范与动态压力协议
│           ├── agent-engineering-rubric.md         # Agent 工程/应用开发深水区追问清单
│           ├── agent-algorithm-rubric.md           # Agent 算法/评测/后训练深水区追问清单
│           └── evaluation-and-delivery.md          # 6 维标尺、JSON Schema、表达诊断与模式 C 剧本
└── sidecars/
    └── acm_board/
        ├── sidecar.json                            # Sidecar 视图与交互权限配置
        ├── main.mjs                                # 本地题目同步、代码运行、进度聚合 API 与居中大窗
        ├── index.html                              # 暗黑双标签工作台 UI（ACM 白板 + 成长看板）
        ├── app.js                                  # ACM 编辑器交互、倒计时、Tab 切换与一键提交
        └── dashboard.js                            # 零依赖 SVG 雷达图/折线图、表达诊断与一键二刷交互
```

## License

[MIT](LICENSE)
