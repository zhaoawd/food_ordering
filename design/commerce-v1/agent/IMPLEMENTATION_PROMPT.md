# 给实现 Agent 的首轮提示词

请在 food_ordering 仓库中实施本设计包，但本轮**只执行任务 A00**。

先读取仓库自己的 AGENTS.md、package.json、verification 以及设计包 README、agent/START_HERE.md 和 agent/tasks.json。记录实际分支、commit SHA、工作区未提交改动、依赖锁文件和可用设备/驱动能力。不要覆盖已有改动，不要升级Expo/RN，不要替换旧fixture。

运行仓库已经存在的测试命令并记录完整退出码。识别原有失败与环境blocked。对比设计包与实际代码，输出：可复用资产、真实缺口、提议路径的修正、后续任务依赖、需要批准的规则变化。

本轮不要实现新UI，不要接真实支付，不要修改golden让旧测试通过，不要把现有App或VM未提供的能力写成已完成。输出baseline报告和证据索引，所有未运行项目明确not_run或blocked。

后续领取任务时，每次只选一个依赖满足的任务；按冻结验收定义先补测试、再实现、再收集外部截图/AX/服务端读回。任何规格、金额预期或golden变更单独交Reviewer批准。
