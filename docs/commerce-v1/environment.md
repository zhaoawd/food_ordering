# commerce-v1 首批交付环境

- 状态：已固定，适用于批次 A01 起的正式开发批次
- 固定日期：2026-11-06
- 依据：autophone 修复闭环样本 `REQ-20261106-005`（页面流程，`accepted`）

本文记录 P0a 验证通过的执行环境。后续批次在此环境内运行；任一项变化时，先在新环境重做最小修改闭环，再更新本文并注明适用日期。

## 1. 验证依据

| 项 | 值 |
| --- | --- |
| 样本 | 首页标题文案修改：`home.hero.headline` 由“今晚，好好吃一顿”改为“今天，好好吃一顿” |
| 需求 / 工作流 | `REQ-20261106-005` / `DWF-REQ-20261106-005-001` |
| 闭环 | 冻结设计 → 本单现采 → 比较（1 Finding）→ Codex 分析 → 修复构建 → 精确安装 → 复验 `passed` → 出口闸 `gate.ok=true`（11 项） |
| 修复构建 | `bld-56774ffd9fcf9d7346f1998fc32c5f4337a4cb59b1321eddbecf2c7079c59aab` |
| 验收范围 | `scoped`，只覆盖 1 个元素的 text 属性；不是 `full_visual` |
| 原始证据 | autophone 本机 `.claude/worktrees/upstream-delivery-regression/test-results/upstream-page-live/`；记录见同工作区 `evidence/outputs/upstream-page-regression-20261106/README.md` |

同一样本的前一次运行 `REQ-20261106-004` 暴露了两项平台缺陷，修复后才得到上述结果。该次失败保留，不计入通过。

## 2. 设备与 VM

| 项 | 值 |
| --- | --- |
| Rig | `isolation-peer`（host `kolardemacbook-pro`，generation 1） |
| VM 目录 | `~/.vphone/machines/isolation-peer` |
| 协议 | `upstream_v1` |
| Guest 系统 | iOS 27.0.1 |
| 设备画像 | `vphone-ios27-default` |
| 画布 | 430×932 pt，scale 3，截图 1290×2796 px |
| 主题 / 语言 | `light` / `zh-CN`（2026-11-06 由 `en-US` 切换，见 E6）；设备首选语言 `zh-Hans-CN`，区域 `zh_CN`，采集前由平台实测核对 |
| 采集环境指纹 | `isolation-peer/vphone-ios27-default/zh-CN/light`（2026-11-06 由 `REQ-20261106-008` 确认）；此前为 `…/en-US/light` |
| 字号档位 | 平台默认档（采集时按 `DEFAULT_TEXT_SIZE_CATEGORY` 核对） |

首阶段只用这一台 Rig。不使用 legacy VM、Duo 或多 VM 业务并发。

## 3. 平台与工具版本

| 项 | 值 |
| --- | --- |
| autophone | `a455eb4a3`（含 PR #335、#336、#340）；`fcb2549d5` 为 en-US 基线时的版本 |
| vphone-cli | `~/github/vphone-cli/.worktrees/autophone-release`，分支 `autophone/release`，`bb533bd733081363b898b5186b6a5e52029b3c1b` |
| Control Plane | 本机 `127.0.0.1:8100`，PostgreSQL `autophone_control`；设备执行经 Assignment 与 ScreenLock |
| 宿主系统 | macOS 27.2，Xcode 27.1（27A9269），Node v22.22.3 |
| 产品栈 | Expo `~53.0.13`，React Native `0.79.4`；Release 构建，嵌入 `main.jsbundle` |
| CocoaPods 依赖种子 | `dependency-cache/cocoapods/sha256-fd77e451afc20a7a97d58e9d5f1f577df983922da5584967415d3981e79c78ad` |
| 分析模型 | Codex，`codex-cli 0.154.0`（二进制 SHA-256 `4f85982624b3898c8991cb80c0981b2aa71070e3537046c9a95950318a95afcc`），模型 `gpt-5.6-sol`，隔离分析端口 `codex-analysis-toolless/v1` |
| 模型调用上限 | 按每次授权单独设置并持久计数；费用未回报时记 null |

`codex-cli 0.163.0` 曾在推理前被隔离校验拒绝（`ai_tool_isolation_unsupported`），不在本环境内使用。

## 4. 输入与判定格式

| 项 | 值 |
| --- | --- |
| 需求输入包 | `requirement-input-package/v1`，放在 `.autophone/requirements/<key>/` |
| 结构化设计 | `structured-design-package/v1` |
| 设计编译器 | `requirement-design-compiler/v1`，期望图 1290×2796 |
| 采集环境登记 | `delivery-launch-self-capture-environment/v3` |
| 出口闸 | 11 项确定性条件；验收不要求人工确认 |

commerce-v1 原始设计包（`food-ordering-design/1.0.0`，390×844）须按交付方案 B3 转换为上述格式后才能进入工作流。转换产物与缺口清单见 [A01 设计输入](../../.autophone/feature-designs/commerce-v1-a01/README.md)。

## 5. 尚未覆盖的差异

| 编号 | 差异 | 影响 | 处理 |
| --- | --- | --- | --- |
| E1 | 样本源码是 `eba2cc658ac8d7528be1ef4c56ea07bf25eb317b`（分支 `autophone/req-upstream-d0-dish-default`），不在 `main`。`main` 使用另一实现 `99a9995` 适配 iOS 27 场景生命周期，两者有 3 个文件不同 | commerce-v1 基线 `main` 尚未在本环境构建和现采 | 2026-11-06 已在本环境构建 `main`（`bld-51fed719…`），菜品默认态无修改现采 0 Finding、accepted（`REQ-20261106-006`），对该状态关闭，见 [baseline.md](baseline.md) |
| E2 | 验证只覆盖单元素 text 修复 | 布局、样式、多页面与交易流程的闭环能力未证实 | 由 P1 校准与各批次验证 |
| E3 | 只验证一台 Rig、同一宿主 | 不能推断多 Rig 或跨主机 | 首阶段不扩展 |
| E4 | 运行时主工作目录有未跟踪文件，源码身份标记为 dirty | 身份记录精确到 commit，但不是干净树 | 正式批次前清理主工作目录，或在批次记录中注明 |
| E5 | 宿主并行运行 Release 构建与重型检查时，曾出现两台 VM 健康探测同时超时并被隔离（2026-11-06，原因未查证） | 批次中途 Rig 可能被隔离，任务排队 | Rig 有任务或需保持可用时，本机构建与重型检查不并行；隔离后按授权执行 `control recovery resume --retry` |
| E6 | 设备系统语言于 2026-11-06 由用户手动从 `en-US` 切换为 `zh-CN`，与设计包 fixture 的 `locale` 一致 | 采集环境指纹改变；`REQ-20261106-006` 与 iOS 27 首页校准均在 `en-US` 下取得，不能直接沿用 | 平台原先只取 App Driver 的语言常量，不读设备，zh-CN 无法如实声明；autophone PR #340（`a455eb4a3`）改为采集前实测设备语言与区域并分开判定。`REQ-20261106-007` 被拒：设备语言已改中文但区域仍为美国（`zh-Hans_US`），用户随后将区域改为中国大陆。`REQ-20261106-008` 在 zh-CN 下对同一基线构建无修改现采：0 Finding，出口闸 11/11，accepted，0 次模型调用。已关闭；App 进程内的有效语言只记录未判定 |

## 6. 变更规则

- 第 2、3 节任一项变化（Rig、协议、iOS、画像、autophone、vphone-cli、Xcode、Expo、Codex CLI 或模型）都视为环境变更。
- 环境变更后先重做最小修改闭环，通过后更新本文并保留旧记录。
- 批次运行中不得切换环境；需要切换时结束当前批次并在记录中说明。
- 已排定：`vphone-vm` SIGTERM 有序关机修复放在首阶段结束后进行；修复后按本节重新认定环境。
- 资源准入的真实业务负载测试与 commerce-v1 批次错开使用 `isolation-peer`。
