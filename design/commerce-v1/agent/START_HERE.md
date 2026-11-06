# Agent 开发入口

这是一份待实施设计包，不是已经升级的 App。先执行 A00，不要直接重写全仓库。

1. 固定真实 Git SHA，阅读项目 AGENTS.md / 现有 verification 协议，运行 package.json 已存在的测试；保留旧基线。
2. 阅读 `docs/PRODUCT_DESIGN.md` → `spec/business-rules.json` → `spec/screens.json` → `agent/tasks.json`。
3. 执行 `python3 scripts/validate.py`，确认设计包结构与引用有效。这不证明 App 通过验收。
4. 只领取依赖已完成的一个任务。allowed_paths 是建议边界，先核实真实目录；不允许删旧评测以绕过失败。
5. 为该任务的 acceptance_test_ids 先补失败测试，再实现最小纵切。测试期望由冻结规格/独立 oracle 提供。
6. 输出 diff、实际执行命令及退出码、截图、AX、服务端读回、业务事件、未通过项，按 evidence-manifest.example.json 提交。
7. 任何缺失设备能力、支付沙箱或后端实现都标为 blocked / not_run，不能记为 passed。

## 角色与权限

Planner 只拆任务和依赖；Builder 改允许路径；QA 不接受 Builder 自改期望；Reviewer 负责业务/安全/无障碍；Release 由人批准。
实现 Agent 不得同时修改业务实现、fixture金额、黄金截图后声称修复完成。规格变更需独立评审、revision递增、重新生成派生物。

## 数据真源

`spec/` + `fixtures/` 是本版评审真源。Figma、HTML与截图是设计投影；修改Figma不能自动改服务端价格和测试期望。
真正开发时固定 spec_revision + spec_sha256 + repo_sha + fixture_sha；生成的TypeScript类型、常量、测试选择器不得手工漂移。

## 验证构建与正式构建

旧仓库已有 nonce/命令白名单，但 nonce 不等于生产鉴权。测试构建、测试账号、测试后端隔离。
正式构建必须移除 seed/reset/advance_time/mock_pay 和相关桥接，禁用测试profile，并跑负向调用验证。
真实支付、真实通知、应用签名和最终分发仍需相应沙箱或真机验收。
