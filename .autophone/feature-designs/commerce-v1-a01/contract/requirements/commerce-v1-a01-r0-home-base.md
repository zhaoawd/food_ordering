# A01 r0：commerce-v1 基线轮（结构基线）

## 角色

基线轮（`round_role=baseline`）：只冻结设计并建立基线源码，不走修复闭环，不产生 accepted。目的是让 A01 三个状态能被确定性准备和采集，从而按同一构建的 3 次采集得到噪声基线（B4 用户决定：先加基线轮）。

## 基线

- 上游：A00 冻结基线 `main` @ `337ff937a7460106d13e1aee9464d93c41af89f2`（产品代码与 r0 分支起点 `e763950` 相同）。

## 实现范围

- 5 个 Tab 底部导航（`nav.*`），游客可直接浏览。
- 首页默认态与游客态、订单空态，元素按 A01 第 14 轮设计包暴露 `testID = stable_id`。
- 点餐、优惠、我的占位页（`menu.search`、`member.card`）。
- verification 构建按选择文档 `state_id` 准备 `home.default.v1`、`home.guest.v1`、`orders.empty.v1`。

## 基线构建与采集

- 构建：`bld-c9445a0bb2d1ea7eb44926594c724138ad29bacf50e40f0e4024fadc8687d046`（提交 `12301ee`，clean Release，依赖可复现）。
- 噪声基线（isolation-peer，`vphone-ios27-default`/zh-CN/light，每个状态 3 次独立采集两两比较）：
  - `home.default.v1`：最大变化比例 0.0000951，通道差 1（变化位于首页主推插画区域）；
  - `home.guest.v1`、`orders.empty.v1`：0。

## 非目标

- 不要求与设计逐像素一致；视觉差异由 r1–r3 的交付闭环处理。
