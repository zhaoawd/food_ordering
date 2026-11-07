# A01 r3：订单页空态

## 需求目标

新增订单 Tab 的空态 `orders.empty.v1`：文案“还没有订单”，主操作“去点餐”（D2）；订单入口不再显示购物袋。

## 基线

- 上游：r2（`commerce-v1-a01-r2-home-guest`）验收后的分支末端。
- 改前证据：r0 构建订单空态的采集（视觉校准 `CAL-…ddf3c06d3cbd`）。A00 没有订单页，r0 起才有。

## 实现范围

- 订单页筛选 ID 为 `orders.filter.all`、`active`、`completed`、`after_sale`（D6）。
- 空态主操作 `orders.empty.primary_action` 跳转点餐。
- 订单页不显示购物袋入口。

## 非目标

- 不实现订单列表与订单详情。

## 验收标准

1. 设计锁定：设计包 `packages/orders.empty.v1/round-17`（DSL 路线），44 条 E3 条款；像素只取 #FAF7F2、#FFFFFF、#EDE6DD 内部（D9），其余同 r1。
2. T004：从首页点击订单入口，订单 Tab 选中，显示“还没有订单”与 `orders.empty.primary_action`，不出现“购物袋”。

## 输入来源

- 设计决定 D2、D6、D9；验收合同 `contract/a01-acceptance-contract.json`。
