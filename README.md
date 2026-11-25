# Agent Interview Coach & ACM Whiteboard (`agent-interview-coach`)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)]()

一款面向 **Google Antigravity** 的原生插件（Skill + Sidecar），专为求职 **中国互联网大厂 / AI 独角兽 Agent 算法工程师 & Agent 应用开发工程师** 打造：

1. **专治 AI 协作项目的“细节盲区”**：结合简历、真实源码与技术报告做逐行红绿灯排雷，生成「四维面试防御卡」；
2. **还原中国公司 60 分钟全真模拟面**：40 分钟项目拷打与八股/场景追问 + 20 分钟 **ACM 模式手撕代码** + 反问与复盘评分；
3. **自带原生「ACM 面试白板」**：支持正中央独立大窗、20 分钟倒计时、本地真实试运行（Python / Node / C++）与一键提交回面试对话，AI 直接读代码先肯定正确思路再精准抓 Bug。

---

## 核心功能

### 1. 模式 A：简历与源码深度排雷（Deep-Dive & Defense Cards）
- **简历 vs 源码红绿灯审计**：
  - 🔴 **高危雷区**：识别简历夸大、源码实现极简或指标口径模糊的地方，给出稳妥改法或最小补齐方案；
  - 🟡 **AI 协作黑盒区**：定位 AI 帮你写进代码的关键参数、Prompt、状态机与工具校验逻辑（精确到文件与行号），用人话讲透；
  - 🟢 **可放大亮点**：提炼最值得主动引导面试官追问的核心技术点。
- **四维面试防御卡**：覆盖面试官必问四刀——**底层实现（What & How） / 选型权衡（Why & Trade-off） / 反事实推演（What if NOT） / 线上故障与评测闭环（Failure & Fix）**。
- **口述压缩版**：提供 30 秒电梯版与 2 分钟 STAR 详版话术。

### 2. 模式 B：中国大厂 60 分钟全真盲考压力面（Strict CN Mock Interview）
- **5 阶段真实节奏**：`[1/5 自我介绍]` → `[2/5 项目深度拷打]` → `[3/5 八股与场景设计]` → `[4/5 ACM 模式手撕代码]` → `[5/5 反问与复盘]`。
- **双方向专业追问库（渐进式按需加载）**：
  - 工程向：编排控制流、Function Calling / MCP 容错、上下文与记忆压缩、RAG、延迟与成本优化；
  - 算法向：Trajectory Eval 轨迹评测、Prompt/Workflow vs SFT/RL 边界、轨迹清洗与 Loss Masking、GRPO/DPO/Reward Hacking、Prefix Caching 与结构化解码。
- **严禁剧透 + 3~5 层链式追问**：每次只抛 1 个核心问题，结合真实源码深挖，结束后输出 6 维评分表、致命漏洞清单、高分重构答案与错题本沉淀。

### 3. 原生「ACM 面试白板」Sidecar
- **零外部依赖**（纯 Node.js + 原生 `sidecar_sdk`），支持右侧辅栏、左侧全屏视图及一键 **「⛶ 居中大窗」**（牛客风左题面 + 右代码双栏暗黑界面）；
- **纯 ACM 体验**：提供完整输入/输出格式、数据范围与样例（绝不剧透 LeetCode 函数签名），内置 20:00 倒计时、Tab 缩进与行号；
- **本地试运行 & 一键提交评审**：支持 Python 3 / JavaScript / C++ 本地执行自测，点击「📤 提交给面试官评审」自动发回当前面试对话；
- **读代码判思路、优先肯定**：AI 直接从代码中判断你的书写思路——即使因语法笔误、I/O 解析或小边界问题跑不通，只要核心算法思路正确也会先明确肯定，再精准定位 Bug 并给出实机边界压测结果与最小修复。

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

## 推荐使用姿势

1. 在本地新建一个备考工作区文件夹（如 `Agent-Interview-Prep/`），放入 `resume/`（简历）、`repos/`（项目源码）、`reports/`（技术报告），并在 Antigravity 中设为当前项目；
2. **先做排雷**：新开对话发送：
   > 使用 `agent-interview-coach` 进入模式 A，结合我工作区里的简历和源码做红绿灯排雷，并为第 1 个项目生成四维面试防御卡。
3. **再做全真模拟面**：新开对话发送：
   > 使用 `agent-interview-coach` 进入模式 B，按中国大厂 60 分钟全真流程对我进行 Agent 综合模拟面试（包含最后 20 分钟的 ACM 手撕白板环节）。

---

## 目录结构

```text
agent-interview-coach/
├── plugin.json                                     # Antigravity 插件清单
├── skills/
│   └── agent-interview-coach/
│       ├── SKILL.md                                # 核心双模式面试官工作流
│       └── references/
│           ├── cn-interview-playbook.md            # 中国大厂 60 分钟流程与 ACM 手撕规范
│           ├── agent-engineering-rubric.md         # Agent 工程/应用开发深水区追问清单
│           └── agent-algorithm-rubric.md           # Agent 算法/评测/后训练深水区追问清单
└── sidecars/
    └── acm_board/
        ├── sidecar.json                            # Sidecar 视图与交互权限配置
        ├── main.mjs                                # 本地题目同步、代码运行器与居中大窗接口
        ├── index.html                              # 暗黑双栏 ACM 面试白板 UI
        └── app.js                                  # 编辑器交互、倒计时与一键提交逻辑
```

## License

[MIT](LICENSE)
