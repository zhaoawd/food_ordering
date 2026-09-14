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
  `workflow input verify` 都判失败。「固定住了」的判据是重算全中。
- `files[].origin` 区分设计原始内容与编译派生物：`authored` 是人/AI 起草的设计真源，
  `compiled` 由确定性编译器生成，`rendered` 是渲染出的位图。
  **改设计只改 authored，然后重新打包**；直接改 compiled/rendered 是篡改。
- 一轮一个分支（`autophone/req-<requirement_key>`），从本次生效分支的当时末端开出。

autophone 侧入口：`uv run python3 -m autophone.cli workflow input list --app <app>`。
