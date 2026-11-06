# A01 r2：首页游客态

## 需求目标

在 r1 首页上实现游客态 `home.guest.v1`：布局与默认态相同，会员条显示“登录 ›”，不显示券数量（D1）；游客可直接浏览，不被强制登录。

## 基线

- 上游：r1（`commerce-v1-a01-r1-home-default`）验收后的分支末端。
- 改前证据：r1 验收构建的游客首页实拍；建单前取 r0 构建游客态的采集（视觉校准 `CAL-…422951fe2a84`）。

## 实现范围

- 游客账号（fixture `account.kind=guest`）下首页会员条文案为“登录 ›”。
- 游客从首页进入点餐不创建账号；业务事件日志不出现 `account_created`。

## 非目标

- 不实现登录流程与点餐页内容。

## 验收标准

1. 设计锁定：设计包 `packages/home.guest.v1/round-14-device`，75 条 E3 条款；比较策略同 r1（D9 遮罩、容差 0、≤ 0.002、0.5 pt）。
2. T001：打开首页并进入点餐，点餐 Tab 选中、点餐页可达，业务事件读回无 `account_created`。

## 输入来源

- 设计决定 D1；验收合同 `contract/a01-acceptance-contract.json`。
