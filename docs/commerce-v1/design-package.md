# commerce-v1 原始设计包入库（P0b-B2）

- 记录日期：2026-11-06
- 位置：[`design/commerce-v1/`](../../design/commerce-v1/README.md)

## 1. 来源与身份

| 项 | 值 |
| --- | --- |
| 包类型 | `food-ordering-design/1.0.0`，`design_handoff_not_application` |
| 来源 | autophone 主工作目录未跟踪目录 `food-ordering-design/`，原样复制；排除 macOS `.DS_Store` |
| 文件数 | 54 个（不含 `MANIFEST.json`） |
| `MANIFEST.json` SHA-256 | `ec6bed1c5fbae3eb4d7cca23dbb1a78c573906b08b52a062e93812f604c174ee` |
| 在线 Figma | `8FJKObnyjHu1O8o87Upy0U`；本次未核对在线内容，以冻结导出为准 |

## 2. 核对

| 检查 | 结果 |
| --- | --- |
| 按 `MANIFEST.json` 逐文件重算 SHA-256 与字节数 | 54/54 一致；无缺失、无清单外文件 |
| 包内静态校验 `scripts/validate.py` | 31/31 通过（在临时副本中运行） |
| 包内原型校验 `scripts/check_prototype.py` | 本次未重跑；沿用包内记录 33/33 |

`scripts/validate.py` 运行时会改写包内 `evidence/package-validation.json`。只能在副本中运行，不得在 `design/commerce-v1/` 原位执行。

上述结果只证明设计包完整、自洽，不代表产品实现或设备验收。

## 3. 使用规则

- `design/commerce-v1/` 不可修改。设计变更以新版本目录出现（如 `design/commerce-v1.1/`），并记录与本版的差异和来源。
- 平台输入（P0b-B3 的转换产物）放在 `.autophone/requirements/<key>/`，记录本包 `MANIFEST.json` 哈希作为来源。
- 包内画布为 390×844；平台编译器要求 430×932 @3x。转换按目标画布重新布局与渲染，不拉伸图片；重排结果视为新设计版本。
