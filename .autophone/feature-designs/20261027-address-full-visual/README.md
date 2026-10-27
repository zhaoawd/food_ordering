# 配送地址设计 v2：full_visual 验收声明

日期：2026-10-27。本目录是配送地址两个状态的新设计版本。布局、Token、Fixture 和文案与 [20261024-v1](../20261024-v1/address/requirement.md) 相同，只追加验收声明。v1 设计包、参考图和历史证据不修改。

## 变更原因

v1 按 scoped 级别打包：参考图在安全区以外全部参与像素比较，通道容差为 0，阈值为 0.2%。参考图文字由 Chromium 栅格化，App 文字由 iOS CoreText 栅格化，两者字形边缘无法逐像素一致。第二轮修复安全区和中文字体后，默认态与公司态仍为 1.960023% 和 2.045485%，剩余差异集中在文字行。

同一工具链在另一台机器上重新渲染 v1 草稿，参考图仍有约 4.4 万个像素不同，全部位于文字行。因此 Chromium 文字像素也不能作为跨机器稳定的真值。

## 验收声明

v2 采用已验收先例 REQ-20260829-002 的 full_visual 机制：

| 声明 | 内容 |
| --- | --- |
| 像素比较遮罩 | `flat_color_interiors`，仅保留 `#FFF8EF`、`#FFFFFF`、`#F7D7B5`、`#E6472F` 的稳定内部像素，边缘内缩 12 px；文字字形、细描边和图标边缘不参与像素比较 |
| 像素阈值 | 通道容差 0、整屏 0.2%、局部 0.8%，与 v1 相同或更严 |
| 文字墨迹几何 | 13 个元素逐个比较墨迹宽、高、面积，容差 2%、6%、9% |
| 纯色区块几何 | 选中地址选项（`#F7D7B5`）和确认按钮（`#E6472F`）边界误差不超过 1 px |
| 元素属性 | 13 个元素都声明 `frame.x/y/width/height`；Text 组件另声明 `resolved_style.fontSize` |

遮罩覆盖率：默认态 84.638521%，公司态 84.227712%。遮罩内像素与 v1 冻结参考图逐像素一致（两个状态的差异像素均为 0），v2 的像素真值是 v1 的严格子集。

## 文件

- `states/<状态>/`：由 `make_full_visual_draft.py` 从 v1 草稿派生的设计真源。
- `packages/address-<状态>/`：autophone `package_prototype_design` 生成的设计包，包含遮罩参考图 `reference.png` 与遮罩前的 `review-reference.png`。

重新派生时指定新的输出目录：

```sh
python3 make_full_visual_draft.py ../20261024-v1/address/states/default /path/to/new/default
```
