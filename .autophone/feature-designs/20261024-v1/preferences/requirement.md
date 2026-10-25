# 饮食偏好设置

需求标识：`food-20261024-preferences-v1`。依赖：无。

## 目标与入口

首页 `home.navigation.profile` 跳转现有 `/profile` 页面，新增“饮食偏好”入口 `profile.preferences`，进入 `/preferences`。本轮只要求最小可用的个人页标题、返回首页和该入口，不扩展账户功能。

## 固定选项

| 分类 | 选项 | 默认值 | 规则 |
| --- | --- | --- | --- |
| 辣度 | 不辣、微辣、中辣 | 微辣 | 必须单选 |
| 忌口 | 香菜、洋葱、花生 | 无 | 可选 0–2 项 |
| 预算 | ¥30 内、¥40 内、不限 | ¥40 内 | 必须单选 |

## 页面与交互

1. 按辣度、忌口、预算排列选项。下方卡片实时显示“当前偏好”摘要。摘要里的忌口始终按香菜、洋葱、花生的固定顺序排列，不按点击顺序排列。
2. 已有两项忌口时点击第三项，保留原选择，在忌口组下显示“最多选择 2 项忌口”，Stable ID 为 `preferences.avoid.error`。取消任意已选项后清除错误。该错误不阻止保存已经有效的两项选择。
3. “恢复默认”只把当前草稿设为微辣、无忌口、¥40 内；用户仍需点击“保存偏好”提交。
4. 保存后返回个人页，并通过 `profile.preferences.summary` 显示摘要；再次进入显示已保存值。返回或系统返回丢弃未保存草稿。
5. 本轮保存偏好及摘要，不调用 AI 推荐服务或更改菜品排序。
6. 首页已有的自由文本输入继续保留其行为，本轮不自动覆盖该输入。

## 设计状态与验收

| 状态 | 草稿 | 摘要 |
| --- | --- | --- |
| preferences.default.fixture-v1 | mild、[]、under40 | 微辣 · 无忌口 · ¥40 内 |
| preferences.edited.fixture-v1 | none、[coriander, peanut]、under30 | 不辣 · 不要香菜、花生 · ¥30 内 |

两个状态初始 committed 均为默认值。Stable ID 前缀分别为 `preferences.spice`、`preferences.avoid`、`preferences.budget`；按钮为 `preferences.reset`、`preferences.save`。

验收范围包括默认显示、组合编辑、第三项限制、取消、恢复默认、保存后再次进入，共 6 条用例。

## 设计与实现约束

- 这是待实现需求。设计包证明结构化设计可编译，不证明 App 已实现或设备验收通过。
- 视觉真源为本功能 `states/` 下的 UI DSL、Fixture 与 Token。参考图和逐元素属性由 autophone 编译器生成。不得编辑 `packages/` 内的派生文件。
- 主验收设备为 430×932 pt、scale=3，参考 PNG 为 1290×2796 px。安全区为上 59 pt、下 37 pt；系统区域单独比较。窄屏正文可滚动，底部操作保持可见，禁止横向溢出。
- 延续 Food AI 的浅米色页面、白色卡片和红色主按钮。选中项同时用背景色和勾选标记表达；实际控件通过 accessibilityState 暴露选中或禁用状态。
- 产品实现使用 React Native / Expo Router。交互控件有稳定 testID 和可访问名称。需要视觉观测的节点接入现有 ObservedPressable、ObservedText、ObservedView，并绑定真实 sourceRef。
- 设计原型为固定状态快照。DSL 中的 interactions 只声明意图；保存、返回、校验和价格联动按本需求实现，不能把静态 HTML 当成交互实现。
- 所有数据本地提供。使用合成地址，不接地图、真实支付、优惠券服务或推荐服务。状态在本次 App 会话内保存；进程重启恢复默认，不要求跨进程持久化。
- 验收模式必须能显式加载每个 state_id 并重置应用状态。加载 Fixture 后用独立的运行时状态处理后续用户操作；不得根据用例名称返回预写结果。
- `acceptance-cases.json` 是本设计集的验收规格，不是 autophone 注册动作或 Operation 的执行脚本。导入时转换为项目支持的用例格式。
- 默认态与变更态进行逐元素视觉比较。其他行为与边界用例按预期文本、选中状态、禁用状态和业务状态验收；未提供参考图的状态不得声称已完成像素验收。
