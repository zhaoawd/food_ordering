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

## v3（同日修订）

设备上 `dish.quantity.decrease`（“−”）与 `dish.quantity.value`（“1/2”）的字色测不出：减号是一条长横笔，数量的 frame 只有约 8.7 pt 宽，笔画游程都超过 autophone 像素字色派生的笔画形状闸。字色缺失后墨迹也无法测量。按用户决定以 v3 移除这两个元素的字色断言，并把它们移出墨迹几何清单（19 → 17）；frame、背景、圆角、文本与字号保留。参考图与 v2 逐字节相同，阈值不变。

禁用减号的背景 `#F3ECE6` 仍由像素比较验证，禁用状态由设备原生验证经 AX 读取；禁用文字色 `#77655F` 不再做视觉验证。

`states-v3/` 与 `packages-v3/` 由当前 `make_full_visual_draft.py` 生成；`states/` 与 `packages/` 是 v2，由该脚本的上一版生成。

## v4（2026-10-28）

autophone `1863b2a41` 起，像素字色派生的笔画上界取帧宽 8% 与帧高 10% 的较大者，按内容定宽的 1–2 个字符可以派生字色（实测数量“1/2”为 `#241713`）。v4 恢复 `dish.quantity.value` 的字色断言并放回墨迹几何清单（17 → 18）。减号“−”整帧只有一条横线，与分隔线无法区分，仍不派生字色，保持 v3 的处理。参考图与 v3 逐字节相同，阈值不变。

`states-v4/` 与 `packages-v4/` 由当前 `make_full_visual_draft.py` 生成。
