# food_ordering 产品与 UI 设计包 v1

这是一份面向 Agent 实施的**设计交付**，不是已经改造好的 iOS App。

## 先看哪里

- `docs/PRODUCT_DESIGN.md`：产品方案、现状、优先级、规则、后端依赖、迁移及验收边界。
- `ui/prototype.html`：浏览器打开即可使用的独立交互稿；含13页、宽度切换和部分异常态。
- `ui/overview.html` / `ui/overview.png`：多页面全景稿；`ui/screens/` 是单页PNG。
- Figma：<https://www.figma.com/design/8FJKObnyjHu1O8o87Upy0U>，13类页面 + Duo + 3异常态，共17画布，文字/矢量/布局可编辑。
- `agent/START_HERE.md`：交给开发Agent的入口，先执行 A00。

## 数据目录

`spec/` 包含24功能、13页/71态、24业务规则、稳定控件契约、设计token、状态机、schema和领域实体。
`fixtures/` 是合成商品与商业样例，保留legacy-v1与commerce-v1区分。
`api/openapi.json` 是建议的核心交易接口，example.invalid不是真服务。
`agent/tasks.json` 是11任务的依赖图和边界。
`tests/acceptance-cases.json` 是60条验收**规格**；`pickup-flow.maestro.template.yaml` 是待适配模板，不代表已经可在现有App运行。
`evidence/` 记录本包实际执行过的校验，以及原生验证未执行的边界。

## 运行本包校验

```bash
python -m pip install -r scripts/requirements.txt
python scripts/validate.py
python scripts/check_prototype.py
```

第二条脚本只验证设计数据与引用；第三条需要 Playwright 与 Chromium。设置 `CHROMIUM_PATH` 可选已有浏览器，或执行 `python -m playwright install chromium`。浏览器测试加载自包含HTML字符串，不连接业务服务，不触发真实支付。

打开交互稿后可用左下角“从空购物袋开始”，进入标准鸡腿堡套餐，选择默认冰茶/少冰、数量2、加购、选满60减10、确认门店、模拟支付；右栏显示控件ID和金额状态。其他SKU/规格的完整结算仅在规格中定义，交互稿会提示限制。

## 验证边界

本次没有修改GitHub仓库、未构建iOS、未跑VM/实机、未接真实支付。
既有仓库测试被阅读，但未在此环境执行。请勿把设计包的静态/浏览器校验结果当作产品验收结果。正式运行必须锁定commit、二进制SHA、设备、fixture、run_id并采集独立证据。

## 推荐接入方式

先把本包复制到仓库 `design/commerce-v1/` 等独立目录（路径由项目维护者确认），保留现有verification与fixture。让Agent从 `agent/START_HERE.md` 和 A00 开始；不要直接批量重写整个App。规格变更、测试golden更新和真实支付/发布分别审批。

`spec/view-models.json` 还提供各页面的组件槽位、语义数据绑定、控件/分组ID和Figma节点映射；这些是待实现的视图模型，不是已经存在的服务端字段。

重新生成HTML设计稿：`python scripts/build_prototype.py`。重新导出PNG：`python scripts/render_ui.py`（需Chromium与Playwright）。渲染器是演示资产构建工具，不是生产App的金额引擎。
