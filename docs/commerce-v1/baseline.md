# commerce-v1 产品基线（P0b-B1）

- 记录日期：2026-11-06
- 基线：`main` @ `337ff937a7460106d13e1aee9464d93c41af89f2`；该提交只在 `cd8e798` 之上新增 commerce-v1 文档，产品代码与 `cd8e798` 相同
- 环境：[environment.md](environment.md)

## 1. 现有检查

在 `337ff93` 的干净检出上执行 `npm ci` 后运行。本次未修改产品代码。

| 检查 | 结果 |
| --- | --- |
| `test:eval-r1` / `address` / `preferences` / `dish` / `coupons` / `test-command` | 38 / 7 / 11 / 11 / 10 / 5 项，共 82 项通过 |
| `npx tsc --noEmit` | 通过 |
| `npm run lint` | 0 errors，5 warnings |
| 浏览器 `eval-r1` / `address` / `preferences` / `dish` / `coupons` | 5 / 13 / 11 / 13 / 12 项，共 54 项通过 |

lint 的 5 条 warning 均为已有问题，记录为基线状态，不在 B1 修复：

| 文件 | 内容 |
| --- | --- |
| `app/(auth)/_layout.tsx` | 未使用的导入 |
| `app/(auth)/sign-in.tsx` | 未使用的导入 |
| `app/(auth)/sign-up.tsx` | 未使用的导入 |
| `app/(tabs)/search.tsx` | `useEffect` 缺少依赖 `refetch` |
| `components/Filter.tsx` | 未使用的导入 |

未执行 `expo export`；下方 Release 构建已包含 JavaScript 打包。浏览器与 Node 检查只证明隔离组件行为。

## 2. Release 构建

| 项 | 值 |
| --- | --- |
| 构建方式 | autophone `ui-verification build-food-ordering-eval`，profile `verification-build-profile-v2app.json`，clean 模式，使用环境中固定的 CocoaPods 依赖种子 |
| 结果 | `built`，`clean_acceptance_eligible=true`，依赖解析 `reproducible` |
| 源码树 SHA-256 | `d81a56f337fc4b55b381d25b7724bea5afceae76b40d0c28a4422b599f46e192` |
| IPA SHA-256 | `d677eeb9c0477b61f64d843d419e8327df20c3dd4e531fb83a5c8f066171f190` |
| Build ID | `bld-51fed7195e59399b5c615b95adf1d81cce92c82366385836b8fa12bcb2b2748b`（slot 001，label `commerce-v1-baseline-main`） |
| xcodebuild 耗时 | 123 秒 |

## 3. 设备无修改现采

| 项 | 值 |
| --- | --- |
| 安装 | 经 Control Plane 在 `isolation-peer` 精确安装上述 Build ID，Assignment `passed` |
| 需求 / 工作流 | `REQ-20261106-006` / `DWF-REQ-20261106-006-001`（autophone 隔离状态根） |
| 状态 | `dish.default.fixture-v1`，19 个元素 |
| 期望来源 | 独立的 iOS 27 既有原始采集（校准 `CAL-947d2a8b1f644679baefb5a6ce72ea11`），不由本次构建生成 |
| 结果 | 比较 0 Finding；出口闸 `gate.ok=true`，11 项条件通过；终态 `accepted` / `verified` |
| 采集环境 | `vphone-ios27-default` / `isolation-peer/vphone-ios27-default/en-US/light` |
| 模型调用 | 0 次（本次未授权模型调用，测试看板拒绝全部分析调用） |

结论：`main` 在固定环境中可以构建、精确安装，菜品默认态的渲染与已验证构建一致。`environment.md` 的 E1 对该状态关闭。其余页面与状态未在本次覆盖，由各批次在本基线上验证。

## 4. 执行中发生的环境事件

10:52 左右，两台 VM 的健康探测同时出现约 30 秒 UDS 超时，自动恢复未在 30 秒内恢复 `healthy`，两台 Rig 被隔离；安装任务因此排队。VM 进程未退出。经授权执行 `control recovery resume --retry` 后两台 Rig 恢复在线，排队的安装随后通过。

时间上与本机并行运行的 Release 构建及产品浏览器检查重叠；原因未查证。诊断包为 autophone `runs/host-anomalies/kolardemacbook-pro/2026-11-06/HA-95ce06c3cb6d414b934eb6d19fc28046/`。后续 Rig 有任务或需保持可用时，本机构建与重型检查不并行执行。

## 5. 原始文件

autophone 本机 `test-results/commerce-v1-b1/`：检查日志 `baseline-checks/`、构建输出 `build/`、登记与安装回执、无修改运行的浏览器记录 `browser-no-mod/` 及配置。需求状态在 `.claude/worktrees/upstream-delivery-regression/test-results/upstream-page-live/state/requirements/REQ-20261106-006/`。这些文件不入库；清理前须先归档并校验哈希。
