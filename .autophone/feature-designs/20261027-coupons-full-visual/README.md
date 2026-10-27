# 优惠券选择与金额明细设计 v2：full_visual 验收声明

日期：2026-10-27。本目录是优惠券两个状态的新设计版本。布局、Token、Fixture 数据、文案与状态 ID 与 [20261024-v1](../20261024-v1/coupons/requirement.md) 相同。

## 与 v1 的差异

| 项目 | v1 | v2 |
| --- | --- | --- |
| 不可用券 Stable ID | `coupons.unavailable.title`、`coupons.unavailable.reason` | `coupons.unavailable.save20.title`、`coupons.unavailable.save20.reason` |
| 验收级别 | scoped | full_visual |
| 元素属性 | 仅 `coupons.back` 声明 frame | 18 个元素都声明 frame；Text 组件另声明字号 |

不可用券改名的原因：商品合计 ¥32 时 save10 与 save20 同时不可用（C04、C05），v1 的单一 Stable ID 无法区分两张券。实现中每张不可用券使用 `coupons.unavailable.<券>.title/reason`，两个设计状态中不可用的都是 save20。

full_visual 的验收方法与配送地址、饮食偏好、菜品规格相同：

- `flat_color_interiors` 遮罩，只比较 `#FFF8EF`、`#FFFFFF`、`#F7D7B5`、`#E6472F` 的稳定内部像素，边缘内缩 12 px。覆盖率：默认态 81.043081%，选中态 80.939752%。
- 18 个元素的文字墨迹几何，宽、高、面积容差 2%、6%、9%。
- 纯色区块几何：选中的优惠券（`#F7D7B5`）与确认按钮（`#E6472F`），边界误差不超过 1 px。优惠券为单列整宽，边界为整数 pt。

## 文件

- `states/<状态>/`：由 `make_full_visual_draft.py` 从 v1 草稿派生的设计真源。
- `packages/coupons-<状态>/`：autophone `package_prototype_design` 生成的设计包，含遮罩参考图 `reference.png` 与遮罩前的 `review-reference.png`。

重新派生时指定新的输出目录：

```sh
python3 make_full_visual_draft.py ../20261024-v1/coupons/states/default /path/to/new/default
```
