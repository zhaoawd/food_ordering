"""从 v1 地址草稿派生 full_visual 草稿：只追加验收声明，不改布局、Token 和 Fixture。"""
import argparse
import json
import shutil
from pathlib import Path

FRAME = ["frame.x", "frame.y", "frame.width", "frame.height"]
# 与已验收先例相同的文字墨迹容差（REQ-20260829-002）。
INK = {"max_width_delta_ratio": 0.02, "max_height_delta_ratio": 0.06, "max_area_delta_ratio": 0.09}
# 设计 Token 中的实心填充色；描边色 #E8DCD3 只出现在 1px 边框上，不进入遮罩。
MASK_COLORS = ["#FFF8EF", "#FFFFFF", "#F7D7B5", "#E6472F"]
SELECTED_OPTION = {
    "address.default.fixture-v1": "address.option.home",
    "address.company.fixture-v1": "address.option.company",
}


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
    ui = json.loads(ui_path.read_text())
    spec = json.loads(spec_path.read_text())
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
    state_id = spec["state_id"]
    spec["comparison_mask"] = {
        "mode": "flat_color_interiors",
        "include_colors": MASK_COLORS,
        "edge_inset_px": 12,
        "minimum_content_coverage_ratio": 0.12,
    }
    spec["typography_verification"] = {"mode": "ink_geometry", "stable_ids": stable_ids, **INK}
    spec["flat_color_geometry_verification"] = {
        "mode": "component_bounds",
        "targets": [
            {"stable_id": SELECTED_OPTION[state_id], "color": "#F7D7B5"},
            {"stable_id": "address.confirm", "color": "#E6472F"},
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
