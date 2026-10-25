# Food AI 功能需求与设计包

本设计集新增 4 项功能、8 个视觉状态和 27 条验收用例，供 autophone 后续实现。当前交付范围为需求与设计，未修改 App 产品代码。

## 功能与执行顺序

| 功能 | 用户操作 | 自动化验收范围 | 依赖 |
| --- | --- | --- | --- |
| [配送地址选择](address/requirement.md) | 选择家或公司，确认后更新首页 | 单选、草稿、取消、跨页面保存 | 无 |
| [饮食偏好设置](preferences/requirement.md) | 设置辣度、忌口和预算 | 多选限制、错误提示、恢复默认、保存 | 无 |
| [菜品规格与数量](dish/requirement.md) | 选份量、加料和数量，加入购物车 | 价格联动、数量边界、合并规则、角标一致性 | 无 |
| [优惠券与金额明细](coupons/requirement.md) | 选券并查看应付金额 | 满减门槛、不可用状态、券失效、确认时校验 | 菜品规格与真实购物车 |

建议按地址 → 偏好 → 菜品规格 → 优惠券依次实施。前三项也可从当前源码基线独立实施；优惠券应在真实购物车功能完成后实施。

源码基线：`b195ca744b887bc76713008bde8970b4ecb93f0a`，当前分支 `eval/r1-case-v2-start`。该信息只记录设计时看到的源码，不声明该提交已通过设备验收。

## 设计文件

每个功能目录包含 `requirement.md`、`acceptance-cases.json` 和两个 `states/<状态>/`。每个状态的设计真源包含：

- `screen-plan.json`：页面区块。
- `state-fixture.json`：固定文案、选项和业务值。
- `ui-document.json`：组件、Token、Stable ID、交互意图和逐属性验收范围。
- `prototype-spec.json`：页面身份、状态身份、屏幕尺寸和安全区。

最终生成物位于 `packages-v2/`，每个状态目录含 `design-package.json`、`reference.png` 和编译器生成的 `prototype/compiled/index.html`。HTML 是固定状态预览，不执行保存或业务计算。界面交互要求以需求文档和验收规格为准。

| 功能 | 默认态设计包 | 变更态设计包 | 验收用例数 |
| --- | --- | --- | --- |
| 地址 | `packages-v2/address-default/` | `packages-v2/address-company/` | 6 |
| 偏好 | `packages-v2/preferences-default/` | `packages-v2/preferences-edited/` | 6 |
| 规格 | `packages-v2/dish-default/` | `packages-v2/dish-customized/` | 7 |
| 优惠券 | `packages-v2/coupons-default/` | `packages-v2/coupons-selected/` | 8 |

全部设计状态采用 430×932 pt、3 倍 PNG、安全区上 59 pt 和下 37 pt，复用现有 Food AI 色彩。每个可验收元素使用语义 Stable ID。定宽定高按钮包含完整 Frame 属性；内容决定尺寸的文本不声明 Frame 属性。字号、行高属于设计 Token，本次没有将其声明为 production-v1 的 required 属性。

主参考图用于所列页面的逐元素视觉验收。入口新增、个人页摘要、购物车商品行及错误提示以行为规格验收，未提供这些附属界面的独立像素参考图。实施时不得把这些状态统计为已完成视觉覆盖。

## 提交给 autophone

1. 从 `suite.json` 读取功能目录、状态身份、依赖和设计包路径。
2. 以单项 `requirement.md` 作为需求正文，附该功能的两份 `design-package.json` 及其完整目录。
3. 将 `acceptance-cases.json` 转换为 autophone 当前注册动作支持的用例格式，逐条保留预置状态、操作和预期结果。其 `format` 是本设计集格式，`executable=false`；不能直接作为设备脚本运行。
4. 实施者把各 Fixture 接入应用测试状态选择与重置流程，使用真实业务状态派生界面。地址、偏好使用会话级保存；规格与优惠券共用真实购物车状态。
5. 在设备验收阶段生成对应运行时参考图、噪声基线与实际运行证据，再按现有正式流程打包和冻结。

本目录故意不写入 `.autophone/requirements/`，也不伪造 `requirement-input-package/v1`。该正式格式要求运行时参考图和噪声基线；本次仅生成设计参考图。历史需求包和已有编译产物未被修改。

## 重新生成与校验

需要本地 autophone 仓库及其 Python、Node、Playwright 环境。以下命令从本设计集目录执行，路径按实际环境替换。每次指定新的输出目录，禁止覆盖旧设计包。

```sh
/path/to/autophone/.venv/bin/python build_designs.py \
  --autophone-root /path/to/autophone \
  --out /path/to/new-design-packages

node verify_layout.cjs \
  --autophone-root /path/to/autophone \
  --packages /path/to/new-design-packages
```

`build_designs.py` 调用 autophone 的正式设计打包函数，进行 Schema、binding、布局编译、渲染和元素映射校验，并输出 `validation-report.json`。

`verify_layout.cjs` 检查生成参考图的哈希、PNG 尺寸，核对实际输出属性集合与 authored acceptance targets，并检查所有已映射元素的浏览器布局，包括屏内边界、文本溢出和操作区遮挡。它读取本地固定原型，不连接业务服务或设备；结果写入输出目录的 `layout-report.json`。

本次校验结果：8 个状态编译通过，共 136 个元素映射，0 个映射缺口；8 个状态的布局检查均为 0 个问题。源码快照与生成包一致，8 张 PNG 的安全区透明、应用区不透明。

实际运行结果见 `packages-v2/validation-report.json`、`packages-v2/layout-report.json` 和 `packages-v2/source-image-report.json`。这些检查不证明 App 已实现，不替代 iOS 真机或虚拟机验证。

## 实现注意事项

- 首页的购物袋数量当前是局部模拟状态；购物车页面当前只有空态。规格功能明确要求将两者连接到统一购物车状态。
- 首页“我的”当前没有跳转；偏好功能明确要求补充该入口以及个人页最小内容。
- 首页底部“订单”当前路由为 `/cart`，本轮保留这一行为。
- `suite.json` 的依赖不等于 Git 分支已经创建；本次没有创建实现分支、启动设备或发布 App。
