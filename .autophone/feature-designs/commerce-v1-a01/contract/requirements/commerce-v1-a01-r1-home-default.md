# A01 r1：首页默认态改为 commerce-v1 设计（含底部导航）

## 需求目标

把首页改为 commerce-v1 设计版本 `commerce-v1-a01-430/r4` 的默认态（`home.default.v1`），并把底部导航固定为 首页｜点餐｜优惠｜订单｜我的。

## 基线

- 上游：A00 冻结基线 `main` @ `337ff937a7460106d13e1aee9464d93c41af89f2`，Build `bld-51fed7195e59399b5c615b95adf1d81cce92c82366385836b8fa12bcb2b2748b`。
- 改前证据：A00 构建首页实拍，建单时采集。

## 实现范围

- 首页按冻结设计包呈现：品牌、问候语、主推商品与价格、到店自取与外送入口、会员条、推荐货架、AI 入口、底部导航。
- 每个设计包 stable_id 以 React Native `testID` 暴露（`ui-contract.json` mapping）。
- 底部导航 5 个入口各自路由到 `/(tabs)/index`、`/(tabs)/menu`、`/(tabs)/rewards`、`/(tabs)/orders`、`/(tabs)/profile`，当前 Tab 处于选中态。目标页本批只需可达，内容由后续批次交付。
- verification 构建实现 fixture 选择通道（`contract/fixture-selection.v1.json`、`contract/fixture-receipt.v1.json`）；release 构建不编译该入口（R20）。

## 非目标

- 不实现点餐、优惠、订单、我的页面内容。
- 不改变 fixture 数据：时钟、门店、商品与价格取冻结设计包 `fixtures/`。

## 验收标准

1. 设计锁定：设计包 `packages/home.default.v1/round-14-device`，75 条 E3 条款；`home.hero.headline` 字号与 `home.store.name` 字重进入人审清单（平台无生产通道）。
2. 像素比较只取声明平涂色内部（D9：#FAF7F2、#FFFFFF、#F0D8B8、#30271F、#FFF0E7，内缩 12 px），通道容差 0，变化像素比例 ≤ 0.002，frame 容差 0.5 pt，参考图 1290×2796。
3. T003：逐一点击首页、点餐、优惠、订单、我的，五条路由正确，每次点击后目标 Tab 选中，无空点击。
4. 字体实现按可实现性报告的字重（`admission/achievability/home.default.v1.final.json`）。

## 输入来源

- 设计：`design/commerce-v1/`（MANIFEST `ec6bed1c…`），批次 `.autophone/feature-designs/commerce-v1-a01/`，设计决定 D1–D9。
- 验收合同：`contract/a01-acceptance-contract.json`。
