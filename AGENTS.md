# food_ordering

Expo / React Native 点餐示例 App，同时是 autophone 需求 UI 自动化交付的被测产品。本文件是 Codex 与 Claude 共用的仓库指令。

## 定位与职责

- 本仓库负责：产品需求与批次计划、设计输入、App 与业务实现、产品测试、发布配置和交付记录。
- autophone 负责：设计转换、设备驱动、确定性比较、流程协调、证据存储与报告。平台缺口在 autophone 立项修复，产品验收回到本仓库的原批次收口。
- autophone 中本 App 的 Profile 为 `food_ordering_v2`，验证构建的 bundle id 为 `com.autophone.foodorderingdemo.v2`。

## 目录

| 路径 | 内容 | 规则 |
| --- | --- | --- |
| `app/`、`components/`、`store/`、`lib/`、`constants/` | 产品代码 | 按批次任务范围修改 |
| `verification/` | autophone 验证构建所需的观测、夹具、测试通道与 Expo 插件 | 改动会改变构建身份与采集行为；只在任务明确要求时修改，并说明影响 |
| `.autophone/requirements/<key>/` | 交付输入真源 | 见下文“冻结输入” |
| `design/commerce-v1/` | commerce-v1 原始设计包（P0b-B2 起） | 不可修改；变更以新版本目录出现 |
| `docs/commerce-v1/` | 推进方案、环境、基线、批次与发布记录 | 记录引用 autophone 的 run ID、哈希与报告入口，不复制原始证据 |
| `tests/` | 产品单元与浏览器测试 | 见“检查” |

## 冻结输入

- `requirement-input.json` 的文件清单是闭集，重算哈希必须全部一致。
- `authored` 文件是设计真源；`compiled`、`rendered` 由确定性工具生成。改设计只改 `authored` 并重新打包，不直接改派生文件。
- 已冻结的设计、期望值、golden 图片和比较阈值不得为让实现通过而修改。确需调整时创建新版本，并重新验证受影响范围。
- 截图、结构化设计与业务规则冲突时，先登记冲突并形成新输入版本；开发 Agent 不在实现中自行裁定。

## 禁止项

- 真实支付、真实收款或生产凭据；commerce-v1 首阶段只做模拟支付。
- 真实用户数据，以及向 Appwrite 等真实后端写入。`.env` 中只有客户端公开配置，不得加入密钥。
- 批量重写整个 App；按批次与任务边界小步修改。
- 在他人分支上提交或覆盖他人未提交内容。

## 分支

- `main` 是唯一长期分支。功能、修复与文档分支从最新 `origin/main` 开出，完成后快进合回并删除。
- `autophone/req-<key>` 由 autophone 交付轮次创建，一轮一个分支；不在其上做与该轮无关的修改。

## 检查

```sh
npm ci
npm run test:eval-r1 && npm run test:address && npm run test:preferences \
  && npm run test:dish && npm run test:coupons && npm run test:test-command
npx tsc --noEmit
npm run lint
# 浏览器测试各自绑定固定端口，串行执行；需要 Playwright Chromium
npm run test:eval-r1-browser   # 另有 address / preferences / dish / coupons
```

- 按影响选择相关检查；修改共享组件、`verification/` 或构建配置时运行全部检查。
- 浏览器与 Node 检查只证明隔离组件行为，不代替 iOS Release 构建和设备验收。设备验收由 autophone 的确定性出口闸判定。
- 已有失败须与本次改动区分记录，不得因此放宽检查。

## commerce-v1 约束

- 金额以整数“分”计算与传递；界面显示由同一金额派生。
- 报价以服务端为准；订单创建幂等；支付结果未知时先查单，不直接判定成功或失败。
- 控件使用设计包 `spec/ui-contract.json` 中的稳定 ID；不删除既有评测使用的 stable ID 与别名。
- 环境以 `docs/commerce-v1/environment.md` 为准；批次运行中不切换环境。

## 文档

- 使用标准 GFM，图用 Mermaid；短句、明确主语，保持证据强度。
- 原因未查明时如实说明，假设标为待验证；状态描述引用现行代码或证据，历史记录注明日期。
