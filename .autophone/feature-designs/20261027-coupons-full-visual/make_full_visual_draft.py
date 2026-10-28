"""从 v1 优惠券草稿派生 full_visual 草稿：追加验收声明，并把不可用券的 Stable ID 改为按券区分。

布局、Token、Fixture 数据、文案与状态 ID 保持不变。验收方法与配送地址、饮食偏好、菜品规格相同。
商品合计 ¥32 时 save10 与 save20 同时不可用；v1 的 `coupons.unavailable.title/reason` 只能表示
一张券，因此改为 `coupons.unavailable.<券>.title/reason`。两个设计状态中不可用的都是 save20。
"""
import argparse
import json
import shutil
from pathlib import Path

FRAME = ["frame.x", "frame.y", "frame.width", "frame.height"]
# 与已验收先例相同的文字墨迹容差。
INK = {"max_width_delta_ratio": 0.02, "max_height_delta_ratio": 0.06, "max_area_delta_ratio": 0.09}
# 设计 Token 中的实心填充色；描边色只出现在 1px 边框上，不进入遮罩。
FILL_TOKENS = ("color.canvas", "color.surface", "color.soft", "color.brand")
UNAVAILABLE_COUPON = "save20"
# v3：默认态的优惠金额是“¥0”，frame 约 19 pt 宽，笔画游程超过平台像素字色派生的笔画形状闸，
# 字色测不出，墨迹也随之无法测量。只在该状态移除字色断言并移出墨迹清单；选中态“−¥6”可测，不变。
# v4：autophone 1863b2a41 起窄帧短文本可派生字色（实测“¥0”为 #E6472F），恢复默认态该元素的字色与墨迹断言。
UNMEASURABLE_TEXT: dict[str, set[str]] = {}
RENAMED = {
    "coupons.unavailable.title": f"coupons.unavailable.{UNAVAILABLE_COUPON}.title",
    "coupons.unavailable.reason": f"coupons.unavailable.{UNAVAILABLE_COUPON}.reason",
}


def _rename(node):
    if isinstance(node, dict):
        return {key: RENAMED.get(value, value) if key in ("id", "stable_id") else _rename(value)
                for key, value in node.items()}
    if isinstance(node, list):
        return [_rename(value) for value in node]
    return node


def text_ids(ui: dict) -> set[str]:
    found: set[str] = set()

    def walk(node):
        if isinstance(node, dict):
            if node.get("component") == "Text" and node.get("stable_id"):
                found.add(node["stable_id"])
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for value in node:
                walk(value)

    walk(ui["screens"])
    return found


def derive(source: Path, target: Path) -> None:
    if target.exists():
        raise SystemExit(f"output exists: {target}")
    shutil.copytree(source, target)
    ui_path = target / "ui-document.json"
    spec_path = target / "prototype-spec.json"
    ui = _rename(json.loads(ui_path.read_text()))
    spec = json.loads(spec_path.read_text())
    fixture = json.loads((target / "state-fixture.json").read_text())
    tokens = ui["tokens"]
    texts = text_ids(ui)
    unmeasurable = UNMEASURABLE_TEXT.get(spec["state_id"], set())
    stable_ids = []
    for screen in ui["acceptance"]:
        for item in screen["targets"]:
            props = [
                name for name in item["properties"]
                if not (item["stable_id"] in unmeasurable and name == "resolved_style.color")
            ]
            if item["stable_id"] in texts and "resolved_style.fontSize" not in props:
                props.append("resolved_style.fontSize")
            props += [name for name in FRAME if name not in props]
            item["properties"] = props
            if item["stable_id"] not in unmeasurable:
                stable_ids.append(item["stable_id"])
    spec["comparison_mask"] = {
        "mode": "flat_color_interiors",
        "include_colors": [tokens[name]["value"] for name in FILL_TOKENS],
        "edge_inset_px": 12,
        "minimum_content_coverage_ratio": 0.12,
    }
    spec["typography_verification"] = {"mode": "ink_geometry", "stable_ids": stable_ids, **INK}
    spec["flat_color_geometry_verification"] = {
        "mode": "component_bounds",
        "targets": [
            {"stable_id": f"coupons.option.{fixture['values']['option']}", "color": tokens["color.soft"]["value"]},
            {"stable_id": "coupons.confirm", "color": tokens["color.brand"]["value"]},
        ],
        "max_bounds_delta_px": 1,
    }
    ui_path.write_text(json.dumps(ui, ensure_ascii=False, indent=2) + "\n")
    spec_path.write_text(json.dumps(spec, ensure_ascii=False, indent=2) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("target", type=Path)
    args = parser.parse_args()
    derive(args.source, args.target)


if __name__ == "__main__":
    main()
