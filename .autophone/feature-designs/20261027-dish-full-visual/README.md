# 菜品规格与数量设计 v2：full_visual 验收声明

日期：2026-10-27。本目录是菜品规格两个状态的新设计版本。布局、Token、Fixture 数据、文案与状态 ID 与 [20261024-v1](../20261024-v1/dish/requirement.md) 相同，只追加验收声明。

验收方法与配送地址、饮食偏好相同：参考图文字由 Chromium 栅格化，App 由 iOS CoreText 栅格化，字形边缘无法逐像素一致。

- `flat_color_interiors` 遮罩，只比较 `#FFF8EF`、`#FFFFFF`、`#F7D7B5`、`#E6472F` 的稳定内部像素，边缘内缩 12 px。覆盖率：默认态 81.544855%，定制态 82.547631%。禁用控件色 `#F3ECE6` 不在遮罩内。
- 19 个元素都声明 frame；Text 组件另声明字号。
- 19 个元素的文字墨迹几何，宽、高、面积容差 2%、6%、9%。
- 纯色区块几何：各状态选中的份量与加料（`#F7D7B5`）和加入购物车按钮（`#E6472F`），边界误差不超过 1 px。三列加料的中间一列（豆腐）两侧边界为非整数 pt，按饮食偏好 v3 的结论不作为纯色区块目标；本设计两个状态都未选中豆腐。

## 文件

- `states/<状态>/`：由 `make_full_visual_draft.py` 从 v1 草稿派生的设计真源。
- `packages/dish-<状态>/`：autophone `package_prototype_design` 生成的设计包，含遮罩参考图 `reference.png` 与遮罩前的 `review-reference.png`。

重新派生时指定新的输出目录：

```sh
python3 make_full_visual_draft.py ../20261024-v1/dish/states/default /path/to/new/default
```
