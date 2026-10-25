# 配送地址首轮实施计划

> 执行技能：superpowers:executing-plans。按已批准首轮范围连续实施。

**Goal:** 实现两条固定配送地址的选择、确认、取消和会话内保存，验证 A01–A06 与两个冻结设计状态。

**Architecture:** Zustand 保存 committed 地址；同一 Store 保存未提交 draft，离开即丢弃。Fixture 仅按选择 nonce 初始化一次；用户操作由真实业务状态驱动。Expo Router push/back 保留首页实例。

**Tech Stack:** React Native、Expo Router、Zustand、Node test、Playwright、autophone。

**Spec:** `.autophone/feature-designs/20261024-v1/address/requirement.md`

## Global Constraints

- 固定 home/company 合成地址；仅会话保存，进程重启默认 home。
- 430×932 pt、scale=3；窄屏滚动正文，底部确认可见。
- 不改设计、历史证据和比较阈值；不接地图、支付或真实地址服务。
- 设备操作经过 Control Plane 和共享 ScreenLock。机器出口闸与 Case 转正分别报告。

## Review Focus

- 连续确认不得重复保存和返回。
- 顶部返回、系统返回、手势返回均丢弃 draft。
- 导航往返保留推荐、购物袋和已保存地址。
- 同一 Fixture nonce 不能因重新挂载覆盖保存值。
- 未知 state_id 不得被当成地址 Fixture 成功装载。

## Tasks

- [x] 1. 先新增地址状态及 Fixture 的失败测试，再实现 `store/address.store.ts`；验证选项、提交、重复提交、会话初始化与未知状态。
- [x] 2. 新增真实首页与地址页面的浏览器回归，确认旧首页无法进入地址；实现 `app/delivery-address.tsx` 和首页入口。覆盖 A01–A06、浏览器返回、窄屏操作区和两个状态全部属性；浏览器证据不冒充 iOS。
- [x] 3. 接入 `verification/useEvalFixture.ts` 与状态选择，验证只初始化一次及初始导航。运行相关 Node、Playwright、类型和 iOS export 检查；区分既有失败。
- [ ] 4. 使用产品源码构建 Release IPA、登记 Build、指定 Build 安装。现采两个状态和 A01–A06 设备证据，保存真实失败和门控回执。
- [ ] 5. 独立设计一致性与运行时基线检查后打包正式需求输入，逐状态冻结并验证出口闸。无法满足的前置条件明确记 blocked，不生成成功回执。
- [x] 6. 独立评审、修复范围内问题，提交本轮产品改动和平台证据，报告剩余阻断。首轮不自动合入或发布。

## 执行记录

- 产品基线 b5a5434b4888266a1d2e3c7bcb2d0e8bccd6b5a1；平台基线 b28751246fb3e47d1bdc7d07a244d363c09d45ab。
- 产品使用隔离本地 clone；工具只支持当前 autophone 仓的原生 worktree，未修改原产品 checkout。
- 依赖离线安装因 ENOTCACHED 失败，改按原锁文件联网安装到隔离目录。

## 首轮结果（2026-10-25）

- 产品实现提交：`9206c97910d83cc05120a8523045e305540c3c51`。7 项 Node 测试与 11 项 Playwright 测试通过；类型检查、变更文件 ESLint、iOS export 通过。
- Release IPA 构建并指定 Build 安装成功：`bld-2c26d9683b22ae94de9ae5102260ddf0c2f0246c0c34f0d0d3013d328d8951d6`。CocoaPods 构建前无锁文件，回执标记依赖解析不可重放。
- 两个状态各完成 3 次原生校准和一次 D0 采集。每个状态的 13 个必需节点均有独立证据；D0 像素变化比例为 4.163576% / 4.302944%，超过冻结阈值 0.2%。两张需求首轮均 closed/failed，未验收。
- 原生交互补验确认：首页地址回填、再次打开保留选择、顶部返回取消、推荐与购物袋状态保留。边缘返回手势两次未返回，原因未查明；原生快速双击与保存后进程重启尚未独立验证。
- 正式 requirement-input-package 归档待处理：现行 `expectation_from_requirement` 仅接受 `prd`，本轮使用 `structured`。未改写输入类型或冻结设计来绕过限制。
- 平台修复 dimension Token 的 `layout.gap` 解析并加入两个地址状态驱动器；106 项编译相关测试通过，独立评审未发现重要问题。
- 首轮证据：autophone 工作区 `evidence/outputs/food-address-first-round-20261025/README.md`。剩余工作是视觉差异诊断修复、返回手势诊断、原生行为回归资产、正式输入包归档和第二轮复验。
