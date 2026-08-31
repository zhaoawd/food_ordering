# .autophone —— 交付需求输入

这个目录是 **autophone 交付闭环的输入真源**，属于本产品项目，不属于 autophone 仓。

```
.autophone/requirements/<requirement_key>/
├── requirement-input.json   # requirement-input-package/v1 清单：逐文件的用途、来源分类与哈希
├── requirement.md           # 需求原文（页面上传/展示的就是它）
├── design/                  # structured-design-package/v1，设计原始内容与叙事
└── expectation/             # PRD 可执行期望：runtime golden 与噪声基线
```

- `requirement-input.json` 的 `files[]` 是**闭集**：多一个文件、少一个文件、哈希对不上，
  `req input verify` 都判失败。「固定住了」的判据是重算全中。
- `files[].origin` 区分设计原始内容与编译派生物：`authored` 是人/AI 起草的设计真源（UI DSL、
  Fixture、各类契约），`compiled` 由确定性编译器生成，`rendered` 是渲染出的位图。
  **改设计只改 authored，然后重新打包**；直接改 compiled/rendered 是篡改。
- `design_package.role=design_source`；机器比较只使用 `expectation.role=executable_expectation` 下的
  runtime golden、噪声基线与属性级条款。
- 一轮一个分支（`autophone/req-<requirement_key>`），串行链从上游冻结提交起逐轮开出。
  这一轮的需求输入与产品改动都落在它自己的分支上。

autophone 侧入口：`uv run python3 -m autophone.cli req input list --app <app>`。
