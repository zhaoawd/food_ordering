# A01 布局起草说明

本文件是 `authored/<state>/layout.json` 与 `bindings.json` 的起草依据。草稿的 `ai_provenance.prompt_sha256` 取本文件的 SHA-256。

## 输入

- 冻结设计包 `design/commerce-v1/`（`MANIFEST.json` SHA-256 `ec6bed1c…`）。
- 430×932 原型基准 `baseline/<page>/prototype-430.{json,png}`，由 `tools/render_baseline.mjs` 以 `?embed&width=430` 渲染同一份 `ui/prototype.html` 得到。
- 平台 DSL：`ui-prototype-document/v1`，组件只用 Screen、Frame、Text、Button、ChoiceGroup、Decoration。

## 规则

1. 布局几何以 430 基准为准：尺寸、内边距、间距、圆角、字号、字重、颜色取基准中的计算值。
2. 能对应到 `design-tokens.json` 的值引用 `$color.*`、`$space.*`、`$radius.*`、`$font.*` 令牌。对应不到的值写入 `local_tokens`（`proto.*` 前缀），由 `derived/token-coverage.json` 统计偏差，不改写设计令牌。
3. 系统区域按平台视口画像处理：顶部安全区 59pt 取代原型 44pt 的模拟状态栏；底部安全区 37pt 取代导航栏 17pt 的底部内边距，导航按钮区高度保持 59pt。
4. 显示文本一律通过 `view.*` 绑定。文本值由 `bindings.json` 的定位器从基准中提取，不手写。
5. `stable_id` 优先使用 `ui-contract.json` 与原型 `data-testid`；视图模型给出的 `control_or_group_id` 其次；其余文本在所属控件或区块命名空间下新增，并在 `derived/acceptance-scope.json` 中列出。
6. 图标和插画无法用注册组件表达，以无样式的 Decoration 占位并保持尺寸；不进入验收范围。
7. 验收范围只声明本状态需要的元素与属性。宽高都为显式尺寸的盒子声明 `frame.*`；内容撑开的盒子不声明。
8. 低于首屏可视区域或被导航遮挡的元素保留节点，不进入验收范围。
9. 原型以外的视觉决定不在草稿中补写，记录为设计缺口。
