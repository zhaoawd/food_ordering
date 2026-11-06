# D4 验证：用平台 v1 HTML 草稿路径打包原型

日期：2026-11-06。范围：`home.default.v1` 一个状态，autophone `5a64dc763`。本验证只回答“HTML 路线能否替代 DSL 路线”，不产生正式设计包，不进入 B4。

## 1. 做法

`html_adapter.py` 以冻结的 `design/commerce-v1/ui/prototype.html` 为入口，只注入三段内容，生成 `prototype-design-draft/v1` 草稿，再用平台已有的 `ui-design package` 打包：

1. 设置原型读取的查询参数（`embed`、`width=430`、`page`）；
2. R4 外壳样式：59pt 顶部占位取代 44pt 模拟状态栏，导航底部 37pt 内边距（与 DSL 草稿的视口画像相同）；
3. 渲染后按 `derived/bindings/<state>.json` 的同一组定位器写 `id` 与 `data-stable-id`，并应用 D3 的显示文本。元素自身文本与子元素混排时（品牌名、人气区标题），把自身文本包进 `span` 再标记。

```sh
python3 -I spike/html_adapter.py home.default.v1 <out>/draft
uv run --group platform python3 -m autophone.cli ui-design package <out>/draft --out <out>/pkg   # 在 autophone 根目录
```

## 2. 结果

| 项 | HTML 路线（v1） | DSL 路线（第 6 轮） |
| --- | --- | --- |
| 打包 | 31/31 映射，0 缺口 | 28 个元素，0 缺口 |
| 首次打包 | 被 `prototype_fixture_text_drift` 拒绝：品牌名、人气区标题按整个元素取文本，含子元素文字；包 `span` 后通过 | — |
| 图标、插画、价格 `¥` 小字号、导航图标 | 保留 | 无法表达（P1、P4） |
| 主推标题两行 | 无法分别映射（`<br>` 分行，没有独立元素） | 两个 Text 节点（P2 的处理） |
| 共有属性 | 71 项中 67 项相同；4 项是导航按钮 `frame.x`，差 <0.05pt | 同左 |
| 属性数量 | 347：每个元素输出全部属性，含文本的 `frame.*`、`fontFamily`（CSS 字体栈原文）、`lineHeight: normal` | 78：按验收 targets 声明 |
| `comparison_policy` | 无；顶部安全区在参考图中不透明 | `pixel_scope: expected_alpha`，安全区透明 |
| 编译期检查 | 无 Screen Plan、令牌、组件校验；Fixture 只做文本一致性检查 | Schema、绑定、令牌、组件校验 |

两条路线在共有属性上几乎完全一致，说明 DSL 草稿的几何与样式忠实于原型，HTML 路线也正确复现了 R4 重排。对照图：[v1-vs-dsl.png](v1-vs-dsl.png)（左 HTML 路线，右 DSL 路线）；数据：[route-comparison.json](route-comparison.json)。

## 3. 按现行证据契约，HTML 路线缺什么

| 缺口 | 后果 | 需要的平台改动 |
| --- | --- | --- |
| 没有视口画像与系统 UI 策略 | 设备比较会把真实状态栏区域计入像素差 | v1 草稿接受可选 `viewport_profile`，复用现有 `_apply_viewport_comparison_scope` |
| 没有逐元素属性范围 | 文本的 `frame.*`、CSS 字体栈与 `lineHeight: normal` 进入期望，设备上必然不符 | v1 草稿接受可选 `acceptance.targets`，复用现有 `_project_property_scope` |
| 入口不能带查询参数 | 需要适配器改写 HTML 才能选页面与宽度 | 可选：`entry_query` 字段；或保留适配器注入 |
| 适配器注入内容的身份 | 设计包只记录草稿文件摘要，不区分原型原文与注入部分 | 在草稿中记录原型 SHA-256 与适配器版本（本验证写在 `adapter` 字段，未单独校验） |
| 透明背景不输出 `backgroundColor`、`<br>` 分行不能单独映射 | 少量元素无法按 DSL 的口径声明 | 接受这两点为 HTML 路线的映射规则，或在适配器中包裹 |

前两项是采用 HTML 路线的前提；改动都是 v1 草稿的可选字段，复用 v2 已有实现，不改变已有设计包。

## 4. 两条路线的取舍

| | 扩展 DSL（图片组件、换行、混排、收缩控制） | HTML 适配器（扩展 v1） |
| --- | --- | --- |
| 图标与插画 | 需从原型抽出 SVG 冻结为资源，逐个放进 DSL | 原样保留 |
| AI 参与 | 每个状态起草完整布局树（约 60 个节点），需逐元素校准 | 只起草定位器映射；布局来自原型本身 |
| 原型没有的状态（如订单空态） | 可直接起草 | 需先在 HTML 中补出该状态，或仍用 DSL |
| 对原型 DOM 的依赖 | 无（布局与原型解耦） | 定位器依赖原型 DOM 结构；原型改版需重做映射，由准入检查发现遗漏 |
| 平台改动 | 编译器、Schema 与回归测试，新增语义需版本化 | v1 草稿两个可选字段，复用现有实现 |
| 适用 | 项目自己产出的设计 | 外部已有可执行 HTML 的设计 |

## 5. 建议

- commerce-v1 这类已有可执行原型的设计，采用 HTML 适配器路线：先在 autophone 为 v1 草稿补可选 `viewport_profile` 与 `acceptance.targets`，再把本适配器转正。批次合同、准入检查、显示规则与设计决定文件保持不变。
- 原型没有覆盖的状态（`orders.empty.v1`）继续用 DSL 草稿；两条路线共用同一批次合同与准入。
- DSL 的图片、换行与混排扩展暂缓，等项目自己产出设计时再按需求做。
- 现有 DSL 第 6 轮设计包保留为历史版本；切换路线后按新设计版本重新打包，两条路线的共有属性对照作为切换依据。

2026-11-06 用户确认采用。autophone PR #342（`1ad4866b1`）为 v1 草稿补齐 `viewport_profile` 与 `acceptance.targets`；适配器转正为 `tools/html_adapter.py`，首页两个状态自第 7 轮起走 HTML 路线。本目录的 `html_adapter.py` 保留为验证时的版本。
