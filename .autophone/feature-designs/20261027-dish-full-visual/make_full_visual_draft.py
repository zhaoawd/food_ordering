"""从 v1 菜品规格草稿派生 full_visual 草稿：只追加验收声明。

布局、Token、Fixture 数据、文案与状态 ID 保持不变。验收方法与配送地址、饮食偏好相同。
"""
import argparse
import json
import shutil
from pathlib import Path

FRAME = ["frame.x", "frame.y", "frame.width", "frame.height"]
# 与已验收先例相同的文字墨迹容差（REQ-20260829-002、REQ-20261025-001/002、REQ-20261027-001/002）。
INK = {"max_width_delta_ratio": 0.02, "max_height_delta_ratio": 0.06, "max_area_delta_ratio": 0.09}
# 设计 Token 中的实心填充色；描边色只出现在 1px 边框上，不进入遮罩。
FILL_TOKENS = ("color.canvas", "color.surface", "color.soft", "color.brand")
# 三列加料的中间一列两侧边界落在非整数 pt；Chromium 与 iOS 吸附不同（饮食偏好 v3 的结论），
# 不作为纯色区块目标。份量两列各 189 pt，边界为整数。
MIDDLE_COLUMN = {"tofu"}


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


def selected_options(fixture: dict) -> list[str]:
    values = fixture["values"]
    selected = [("portion", values["portion"]), *(("extras", item) for item in values["extras"])]
    return [f"dish.{group}.{value}" for group, value in selected if value not in MIDDLE_COLUMN]


def derive(source: Path, target: Path) -> None:
    if target.exists():
        raise SystemExit(f"output exists: {target}")
    shutil.copytree(source, target)
    ui_path = target / "ui-document.json"
    spec_path = target / "prototype-spec.json"
    ui = json.loads(ui_path.read_text())
    spec = json.loads(spec_path.read_text())
    fixture = json.loads((target / "state-fixture.json").read_text())
    tokens = ui["tokens"]
    texts = text_ids(ui)
    stable_ids = []
    for screen in ui["acceptance"]:
        for item in screen["targets"]:
            props = list(item["properties"])
            if item["stable_id"] in texts and "resolved_style.fontSize" not in props:
                props.append("resolved_style.fontSize")
            props += [name for name in FRAME if name not in props]
            item["properties"] = props
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
            *(
                {"stable_id": stable_id, "color": tokens["color.soft"]["value"]}
                for stable_id in selected_options(fixture)
            ),
            {"stable_id": "dish.add", "color": tokens["color.brand"]["value"]},
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
