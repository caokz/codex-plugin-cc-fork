# Codex Plugin for Claude Code - 详细使用说明

## 目录

- [项目概述](#项目概述)
- [环境要求](#环境要求)
- [安装](#安装)
- [初始设置](#初始设置)
- [斜杠命令](#斜杠命令)
  - [/codex:review](#codexreview)
  - [/codex:adversarial-review](#codexadversarial-review)
  - [/codex:rescue](#codexrescue)
  - [/codex:status](#codexstatus)
  - [/codex:result](#codexresult)
  - [/codex:cancel](#codexcancel)
  - [/codex:setup](#codexsetup)
- [Review Gate（审查门）](#review-gate审查门)
  - [启用与禁用](#启用与禁用)
  - [预设审查模板](#预设审查模板)
  - [多轮审查机制](#多轮审查机制)
  - [设计文档对照审查](#设计文档对照审查)
  - [自定义审查模板](#自定义审查模板)
  - [配置示例](#配置示例)
- [Codex 配置](#codex-配置)
- [典型工作流](#典型工作流)
- [开发指南](#开发指南)
- [FAQ](#faq)

## 项目概述

`@openai/codex-plugin-cc` 是一个 Claude Code 插件，将 OpenAI Codex 集成到 Claude Code 工作流中。支持：

- 使用 Codex 进行代码审查
- 对抗性设计审查
- 将任务委派给 Codex 执行
- 停止时自动审查门（Stop Review Gate）

## 环境要求

- **ChatGPT 订阅（含免费版）或 OpenAI API key**
- **Node.js 18.18 或更高版本**
- **Codex CLI**（可通过 `/codex:setup` 自动安装）

## 安装

### 从官方 Marketplace 安装

```bash
# 添加 marketplace
/plugin marketplace add openai/codex-plugin-cc

# 安装插件
/plugin install codex@openai-codex

# 重载插件
/reload-plugins
```

### 从自定义 Fork 安装

如果你 fork 了这个仓库（例如 `caokz/codex-plugin-cc-fork`）：

```bash
# 添加自定义 marketplace
/plugin marketplace add caokz/codex-plugin-cc-fork

# 安装插件
/plugin install codex@openai-codex

# 重载插件
/reload-plugins
```

### 安装 Codex CLI

如果 Codex 尚未安装：

```bash
npm install -g @openai/codex
```

如果 Codex 已安装但未登录：

```bash
!codex login
```

## 初始设置

安装插件后，运行首次设置：

```bash
/codex:setup
```

该命令会检查：
- Codex CLI 是否已安装
- Codex 是否已认证登录
- 当前环境是否就绪

## 斜杠命令

### /codex:review

对当前代码进行标准 Codex 审查。

**适用场景：**
- 审查未提交的改动
- 审查当前分支相对于 base 分支的差异

**参数：**

| 参数 | 说明 |
|------|------|
| `--base <ref>` | 指定 base 分支进行差异审查 |
| `--wait` | 同步等待审查完成 |
| `--background` | 后台运行审查 |

**示例：**

```bash
/codex:review
/codex:review --base main
/codex:review --background
/codex:review --base main --wait
```

> 该命令是只读的，不会修改任何代码。多文件审查可能耗时较长，建议使用 `--background`。

### /codex:adversarial-review

运行可引导的对抗性审查，质疑实现方案和设计决策。

**适用场景：**
- 发布前的压力测试
- 审查设计选择、权衡、隐含假设
- 针对特定风险领域（认证、数据丢失、竞态条件等）的压力测试

**参数：**

| 参数 | 说明 |
|------|------|
| `--base <ref>` | 指定 base 分支 |
| `--wait` | 同步等待 |
| `--background` | 后台运行 |
| `<focus text>` | 审查焦点文本（在参数之后） |

**示例：**

```bash
/codex:adversarial-review
/codex:adversarial-review --base main challenge whether this was the right caching and retry design
/codex:adversarial-review --background look for race conditions and question the chosen approach
```

> 该命令是只读的，不会修改任何代码。

### /codex:rescue

将任务委托给 Codex 通过 `codex:codex-rescue` 子代理执行。

**适用场景：**
- 调查 bug
- 尝试修复
- 继续之前的 Codex 任务
- 使用更小/更快的模型完成任务

**参数：**

| 参数 | 说明 |
|------|------|
| `--background` | 后台运行 |
| `--wait` | 同步等待 |
| `--resume` | 继续最近的 Codex 会话 |
| `--fresh` | 开始新的 Codex 会话 |
| `--model <model>` | 指定模型（如 `gpt-5.4-mini`、`spark`） |
| `--effort <level>` | 指定推理努力级别 |
| `<task>` | 任务描述 |

**示例：**

```bash
/codex:rescue investigate why the tests started failing
/codex:rescue fix the failing test with the smallest safe patch
/codex:rescue --resume apply the top fix from the last run
/codex:rescue --model gpt-5.4-mini --effort medium investigate the flaky integration test
/codex:rescue --model spark fix the issue quickly
/codex:rescue --background investigate the regression
```

> 不指定 `--model` 或 `--effort` 时，Codex 使用自身默认值。`spark` 会映射为 `gpt-5.3-codex-spark`。

### /codex:status

查看当前仓库中运行中和最近的 Codex 任务。

**示例：**

```bash
/codex:status
/codex:status task-abc123
```

### /codex:result

查看已完成任务的最终输出。包含 Codex session ID，可用于 `codex resume <session-id>` 在 Codex 中继续。

**示例：**

```bash
/codex:result
/codex:result task-abc123
```

### /codex:cancel

取消正在运行的后台 Codex 任务。

**示例：**

```bash
/codex:cancel
/codex:cancel task-abc123
```

### /codex:setup

检查 Codex 环境并配置 Review Gate。详见 [Review Gate](#review-gate审查门) 章节。

## Review Gate（审查门）

Review Gate 是一个基于 `Stop` hook 的自动审查机制。当 Claude 完成代码修改并尝试停止时，自动触发 Codex 审查。如果发现问题，Claude 会被阻止停止，继续修复直到审查通过。

### 启用与禁用

```bash
# 启用
/codex:setup --enable-review-gate

# 禁用
/codex:setup --disable-review-gate
```

### 预设审查模板

通过 `--review-gate-prompt` 选择不同的审查维度：

| 模板名称 | 审查重点 |
|-----------|---------|
| `default` | 通用审查：设计选择、二阶故障、回滚风险 |
| `code-quality` | 代码质量：可读性、命名、DRY、复杂度、错误处理 |
| `security` | 安全审查：注入漏洞、XSS、硬编码密钥、路径穿越、认证绕过 |
| `performance` | 性能审查：算法复杂度、内存泄漏、N+1 查询、阻塞操作 |
| `trading-system` | 交易系统双重视角：A 股交易领域 + 工程质量 |

**使用示例：**

```bash
/codex:setup --enable-review-gate --review-gate-prompt security
/codex:setup --enable-review-gate --review-gate-prompt code-quality
/codex:setup --enable-review-gate --review-gate-prompt performance
/codex:setup --enable-review-gate --review-gate-prompt trading-system
```

### 多轮审查机制

通过 `--review-gate-max-rounds` 设置最大审查轮次（默认 3 轮）。

**工作流程：**

```
第 1 轮: Claude 修改代码 → 尝试停止 → hook 触发 → Codex 审查
  → 发现问题 → BLOCK (round 1/N) → Claude 继续修复
第 2 轮: Claude 修复后 → 尝试停止 → hook 触发 → Codex 审查
  → 仍有问题 → BLOCK (round 2/N) → Claude 继续修复
  ...
第 N 轮: 达到最大轮次 → 自动 ALLOW → 会话正常停止
```

- 每轮 BLOCK 时，reason 中会附带具体问题列表和当前轮次信息
- 达到最大轮次后自动放行，不会无限循环
- 如果某轮审查通过（ALLOW），轮次计数器归零

**使用示例：**

```bash
/codex:setup --enable-review-gate --review-gate-max-rounds 5
```

### 设计文档对照审查

通过 `--review-gate-design-doc` 指定设计文档路径。审查时 Codex 会：

1. 识别被修改的文件
2. 只读取设计文档中与修改文件相关的章节
3. 对比实现是否符合设计规格
4. 发现偏离时引用具体设计文档章节

该功能在 `trading-system` 模板中尤其有用。

**使用示例：**

```bash
/codex:setup --enable-review-gate --review-gate-prompt trading-system --review-gate-design-doc docs/trading-system-design.md
```

支持相对路径（相对于工作区根目录）和绝对路径。

### 自定义审查模板

`--review-gate-prompt` 也接受自定义模板文件路径：

```bash
/codex:setup --enable-review-gate --review-gate-prompt path/to/my-review-template.md
```

自定义模板需要包含以下占位符：

| 占位符 | 说明 |
|--------|------|
| `{{CLAUDE_RESPONSE_BLOCK}}` | Claude 上一次回复内容 |
| `{{DESIGN_DOC_BLOCK}}` | 设计文档引用（可选） |

模板输出格式要求：
- 第一行必须是 `ALLOW: <reason>` 或 `BLOCK: <reason>`
- BLOCK 时后续行以 `- ` 开头列出具体问题

### 配置示例

#### 通用代码质量审查

```bash
/codex:setup --enable-review-gate --review-gate-prompt code-quality --review-gate-max-rounds 3
```

#### 安全审查

```bash
/codex:setup --enable-review-gate --review-gate-prompt security --review-gate-max-rounds 5
```

#### A 股交易系统审查（完整配置）

```bash
/codex:setup --enable-review-gate \
  --review-gate-prompt trading-system \
  --review-gate-max-rounds 5 \
  --review-gate-design-doc docs/trading-system-design.md
```

`trading-system` 模板的审查覆盖范围：

**领域审查（[DOMAIN]）：**
- 订单生命周期：pending/filled/partial-filled/cancelled/rejected 状态转换
- 持仓管理：多空跟踪、T+1 结算、持仓限额
- 价格处理：涨跌停板、tick size、集合竞价/连续竞价、浮点精度
- 风控：下单前风控检查、最大持仓、频率限制、风控绕过检测
- 行情数据：Level 1/Level 2、过期数据检测
- 交易成本：佣金、印花税、过户费、滑点
- 时序与并发：下单/撤单/持仓更新的竞态条件

**工程审查（[ENGINEERING]）：**
- 代码可读性、命名规范、文档质量
- 错误处理：网络故障、超时、交易所 API 部分响应
- 设计模式一致性和 DRY 原则
- 函数复杂度与可测试性
- 类型安全：金融数据避免浮点运算
- 日志审计：关键操作（下单、状态转换、风控事件）的日志记录

#### 查看当前配置

```bash
/codex:setup --json
```

## Codex 配置

插件使用本地 Codex CLI 和 app server，继承你的 Codex 配置。

### 修改默认模型和推理努力级别

在项目根目录创建 `.codex/config.toml`：

```toml
model = "gpt-5.4-mini"
model_reasoning_effort = "high"
```

配置加载优先级：
1. 用户级配置 `~/.codex/config.toml`
2. 项目级覆盖 `.codex/config.toml`（需项目受信任）

### 转移工作到 Codex

通过 `/codex:result` 获取 session ID，然后在 Codex 中继续：

```bash
codex resume <session-id>
```

## 典型工作流

### 发布前审查

```bash
/codex:review --base main
```

### 委派问题给 Codex

```bash
/codex:rescue investigate why the build is failing in CI
```

### 长时间运行任务

```bash
/codex:adversarial-review --background
/codex:rescue --background investigate the flaky test
```

然后定期检查：

```bash
/codex:status
/codex:result
```

### 开启自动审查门

```bash
/codex:setup --enable-review-gate --review-gate-prompt security --review-gate-max-rounds 3
# ... 正常工作，每次 Claude 完成修改后自动触发审查 ...
/codex:setup --disable-review-gate
```

> Review Gate 可能产生较长的 Claude/Codex 循环，消耗使用额度。建议仅在需要主动监控时启用。

## 开发指南

### 项目结构

```
plugins/codex/
├── .claude-plugin/
│   └── plugin.json          # 插件清单
├── commands/                 # 斜杠命令定义（.md 文件）
├── agents/                   # 子代理定义（.md 文件）
├── skills/                   # 技能定义（目录 + SKILL.md）
├── hooks/
│   └── hooks.json            # 生命周期钩子配置
├── prompts/                  # 审查提示模板
├── schemas/                  # JSON Schema 验证
└── scripts/
    ├── codex-companion.mjs   # 主入口 CLI
    ├── stop-review-gate-hook.mjs  # Stop hook 处理
    └── lib/
        ├── app-server.mjs    # JSON-RPC 客户端
        ├── codex.mjs         # Codex 交互逻辑
        ├── prompts.mjs       # 模板加载与插值
        ├── state.mjs         # 持久化状态管理
        ├── job-control.mjs   # 任务控制
        └── tracked-jobs.mjs  # 任务追踪
```

### 开发命令

```bash
npm test                           # 运行所有测试
node --test tests/<name>.test.mjs  # 运行单个测试文件
npm run build                      # TypeScript 类型检查（noEmit）
npm run prebuild                   # 从 codex app-server 生成 TS 类型
npm run bump-version               # 更新插件版本号
npm run check-version              # 验证版本一致性
```

### 约定

- 所有运行时代码为 `.mjs` 格式（ES modules），无需构建/打包
- TypeScript 仅用于类型检查（`noEmit: true`）
- 测试使用 Node.js 内置 `node:test`
- Markdown 文件定义命令、代理、技能和提示模板

## FAQ

### 需要单独的 Codex 账户吗？

不需要。插件使用本地 Codex CLI 认证。如果你已在 Codex 中登录，直接可用。否则运行 `!codex login` 登录。

### 插件使用独立的 Codex 运行时吗？

不是。插件通过本地 Codex CLI 和 app server 工作，共享相同的安装、认证和配置。

### 可以使用自定义 API base URL 吗？

可以。在 Codex 配置中设置 `openai_base_url`。

### Review Gate 消耗额度吗？

是的。每次 Claude 尝试停止时都会触发一次 Codex 审查。多轮审查会消耗更多额度。建议仅在需要时启用，使用完毕后及时禁用。

### 审查没有触发怎么办？

1. 确认插件已安装：检查 `/codex:setup` 是否可用
2. 确认 review gate 已启用：运行 `/codex:setup --json` 检查 `stopReviewGate` 是否为 `true`
3. 确认 Codex 可用：运行 `/codex:setup` 检查环境状态
4. 确认上一轮 Claude 回复中有代码修改：纯状态查询不会触发审查
