# R1：首页限时立减徽标与价格行重排

## 需求目标

在已验收的 Food AI 首页推荐卡价格行增加限时立减信息，并调整价格、预计送达时间和操作文案。

## 基线

- 上一轮：`seq20260914-r0-home-base`（分支 `autophone/req-seq20260914-r0-home-base`）
- 基线来源：上一轮基线核对通过后进入生效分支 `autophone/line-20260914` 的末端 `7df3a10b56b0bd3a8758a6e559bbcd8ad122ae2d`。本轮从该 commit 开出 `autophone/req-seq20260914-r1-savings-badge`。
- 首页默认态已按 R0 基线记录的 10 条属性条款取得证据。

## 实现范围

- 新增徽标“限时立减 ¥6”。
- 新增稳定标识 `home.recommendation.savings`。
- 徽标固定尺寸为 `120×26 pt`，文字在徽标 Frame 内水平和垂直居中。
- 价格 `¥32` 的 Frame 宽度调整为 `56 pt`。
- 预计送达时间移动到价格行右侧。
- 主操作文案改为“立即下单”。
- 次操作文案改为“换个口味”。
- 推荐切换后徽标保持显示。

## 非目标

- 不改变推荐菜品、价格值、匹配度和配送时间值。
- 不新增饮食偏好编辑能力。
- 不修改购物袋和底部导航业务行为。

## 验收标准

1. `home.default.fixture-v1` 的独立 Stable ID 覆盖分母从 18 增加到 19。
2. 徽标的文本、完整 Frame、背景色、前景色和实际渲染圆角满足锁定设计。
3. 价格、徽标和预计送达时间三个子元素的完整 Frame 均取得独立证据，以覆盖相对对齐关系。
4. 操作文案、完整 Frame 和样式满足锁定设计。
5. 参考图和实际图均为 `1290×2796 PNG`，逻辑分辨率为 `430×932 pt`，禁止重采样。
6. 完整视觉比较必须同时满足全局像素阈值、局部像素阈值、Frame 容差和 19/19 独立覆盖。
7. 推荐切换、加入购物袋和底部导航行为回归通过。

## 输入来源

- 需求正文取自历史 R1 需求输入 `autophone/req-r1-savings-badge` 分支的 `.autophone/requirements/r1-savings-badge/requirement.md`，与历史平台需求单 `REQ-20260831-007` 同源；「需求目标」「实现范围」「非目标」「验收标准」四段未改。
- 「基线」段按本轮序列 `seq-20260914-food-ordering-v2-r0r4` 的 R0→R4 串行链重写：上一轮由历史的 `r0-home-base` 改为本轮的 `seq20260914-r0-home-base`，起点由分支末端改为生效分支上的具体 commit。
- 本轮设计原始内容沿用历史 R1 设计包 `demo-verification/food-ordering/greenfield-replay-20260826/design/r1-savings-badge/package-v3`（19 个元素）。
- 本轮可执行期望取历史 R1 需求单 `REQ-20260831-007` 已冻结的 prd 设计块（4 条属性条款 + R0–R3 首页 runtime golden）。
- 本轮设计包与全部文件哈希见同目录 `requirement-input.json`。
- 本轮开工前已对照 R0 基线实测画面重新核定本文「实现范围」的实际增量，核定结果见平台仓
  `evidence/requirement-sequences/seq-20260914-food-ordering-v2-r0r4/r1-delivery-record.md`。
  核定不修改本文的任何要求，也不缩小上列验收标准的范围。
