# R4：推荐卡次操作文案改为「再来一道」

## 需求目标

首页推荐卡的次操作按钮当前写「换个口味」，用户反馈这句话隐含「不喜欢眼前这道」的否定语气。本轮把它改为中性的浏览语义「再来一道」，鼓励用户继续翻看推荐，而不暗示对当前推荐的评价。

## 基线

- 上一轮：`r3-home-preferences-applied`（分支 `autophone/req-r3-home-preferences-applied`）
- 基线来源：上一轮验收后的分支末端。本轮从 `autophone/req-r3-home-preferences-applied` 开出 `autophone/req-r4-next-action-copy`。
- 首页默认态 `home.default.fixture-v1` 自 R1 起未再改动，R1 已按 19 个独立 Stable ID 完成验收。

## 实现范围

- 次操作按钮 `home.recommendation.next_action` 的静态文案由「换个口味」改为「再来一道」。
- 切换中的过渡文案「正在换口味」不在本轮范围，保持不变。
- 按钮的 Frame、背景色、前景色、字号与点击行为（切换下一道推荐）保持基线。
- 主操作按钮 `home.recommendation.primary_action` 文案「立即下单」保持不变，作为本轮的回归验证点。
- 首页其余 18 个 Stable ID 的文本、Frame 与样式保持基线。

## 非目标

- 不改推荐算法、菜品、价格、匹配度与配送时间。
- 不改饮食偏好相关的任何页面与状态。
- 不改购物袋与底部导航。

## 验收标准

1. `home.default.fixture-v1` 下 `home.recommendation.next_action` 的文本为「再来一道」。
2. `home.recommendation.primary_action` 的文本仍为「立即下单」。
3. 参考图和实际图均为 `1290×2796 PNG`，逻辑分辨率为 `430×932 pt`，禁止重采样。
4. 完整视觉比较的全图变化像素比例不超过本轮锁定的阈值；阈值由该状态的实测噪声包络与本轮文案改动的墨迹足迹推出，不抄上一轮。
5. 推荐切换、加入购物袋和底部导航行为回归通过。

## 输入来源

- 本文为 R4 新写的需求原文。设计包由 R1 已验收的首页默认态 UI DSL 派生，只改 `view.next_action` 一处 authored 内容后用 `ui-design package` 重出（`demo-verification/food-ordering/r4-next-action-20260903/design/`）。
- 本轮设计包与全部文件哈希见同目录 `requirement-input.json`。
