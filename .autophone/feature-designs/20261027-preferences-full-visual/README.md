# 饮食偏好设计 v2：fixture-v2 状态与 full_visual 验收声明

日期：2026-10-27。本目录是饮食偏好两个状态的新设计版本。布局、Token、Fixture 数据与文案与 [20261024-v1](../20261024-v1/preferences/requirement.md) 相同。

## 与 v1 的差异

| 项目 | v1 | v2 |
| --- | --- | --- |
| 状态 ID | `preferences.default.fixture-v1`、`preferences.edited.fixture-v1` | `preferences.default.fixture-v2`、`preferences.edited.fixture-v2` |
| 验收级别 | scoped，参考图全部可见像素参与比较 | full_visual |
| 元素属性 | 仅 `preferences.reset`、`preferences.back` 声明 frame | 18 个元素都声明 frame；Text 组件另声明字号 |

状态 ID 改名的原因：autophone 中 2026-09 的旧偏好流程已使用 `preferences.*.fixture-v1`，入口与 24 个元素 ID 都不同，并被构建配置、状态驱动和多项测试引用。同一状态 ID 不能指向两套界面。

full_visual 的原因与配送地址第三轮相同：参考图文字由 Chromium 栅格化，App 由 iOS CoreText 栅格化，字形边缘无法逐像素一致。v2 采用：

- `flat_color_interiors` 遮罩，只比较 `#FFF8EF`、`#FFFFFF`、`#F7D7B5`、`#E6472F` 的稳定内部像素，边缘内缩 12 px。覆盖率：默认态 80.222296%，变更态 80.872433%。
- 18 个元素的文字墨迹几何，宽、高、面积容差 2%、6%、9%。
- 纯色区块几何：各状态实际选中的选项（`#F7D7B5`）与保存按钮（`#E6472F`），边界误差不超过 1 px。

## 文件

- `states/<状态>/`：由 `make_full_visual_draft.py` 从 v1 草稿派生的设计真源。
- `packages/preferences-<状态>/`：autophone `package_prototype_design` 生成的设计包，含遮罩参考图 `reference.png` 与遮罩前的 `review-reference.png`。

重新派生时指定新的输出目录：

```sh
python3 make_full_visual_draft.py ../20261024-v1/preferences/states/default /path/to/new/default
```

## v3（同日修订）

ITER-002 在设备上仍有 3 条 Finding，经像素核对均不是产品缺陷，按用户决定以 v3 移除两项像素上不可见的断言。参考图与 v2 逐字节相同，阈值不变。

| 断言 | v2 | v3 | 依据 |
| --- | --- | --- | --- |
| 中间列选项（微辣、洋葱、¥40 内）的纯色区块几何 | 选中时比较 | 不比较，保留遮罩像素与 frame 比较 | 该列两侧边界为 153.33 / 276.67 pt；iOS 按几何精确绘制为 460–829 px，Chromium 参考图吸附为 459–830 px |
| `preferences.reset` 的 `resolved_style.borderRadius` | 断言 16 | 不断言 | 按钮与页脚同为 `#FFFFFF`，圆角在参考图和设备截图上都不可见，像素派生只能得到 0 |

`states-v3/` 与 `packages-v3/` 由当前 `make_full_visual_draft.py` 生成；`states/` 与 `packages/` 是 v2，由该脚本的上一版生成，保留不改。
