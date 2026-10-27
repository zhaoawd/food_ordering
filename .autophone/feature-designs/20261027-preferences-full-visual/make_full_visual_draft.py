"""从 v1 偏好草稿派生 full_visual 草稿：改用 fixture-v2 状态 ID，只调整验收声明。

布局、Token、Fixture 数据与文案保持不变。v1 的 state_id 与 autophone 中 9 月的旧偏好
流程同名但元素集合不同，因此改名为 fixture-v2，避免同一状态 ID 指向两套界面。
"""
import argparse
import json
import shutil
from pathlib import Path

FRAME = ["frame.x", "frame.y", "frame.width", "frame.height"]
# 与已验收先例相同的文字墨迹容差（REQ-20260829-002、REQ-20261025-001/002）。
INK = {"max_width_delta_ratio": 0.02, "max_height_delta_ratio": 0.06, "max_area_delta_ratio": 0.09}
STATE_IDS = {
    "preferences.default.fixture-v1": "preferences.default.fixture-v2",
    "preferences.edited.fixture-v1": "preferences.edited.fixture-v2",
}
# 设计 Token 中的实心填充色；描边色只出现在 1px 边框上，不进入遮罩。
FILL_TOKENS = ("color.canvas", "color.surface", "color.soft", "color.brand")
# v3：三列选项中间一列的两侧边界都落在非整数 pt（153.33 / 276.67）。Chromium 把参考图上
# 这一列吸附得比几何宽 2 px，iOS 按几何精确绘制，纯色区块边界因此无法对齐；这一列
# 只保留遮罩像素与 frame 比较。
MIDDLE_COLUMN = {"mild", "onion", "under40"}
# v3：重置按钮与页脚同为 #FFFFFF，圆角在像素上不可见，不能作为验收属性。
INVISIBLE_PROPERTIES = {"preferences.reset": {"resolved_style.borderRadius"}}


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
    selected = [
        ("spice", values["spice"]),
        *(("avoid", item) for item in values["avoid"]),
        ("budget", values["budget"]),
    ]
    return [f"preferences.{group}.{value}" for group, value in selected if value not in MIDDLE_COLUMN]


def derive(source: Path, target: Path) -> None:
    if target.exists():
        raise SystemExit(f"output exists: {target}")
    shutil.copytree(source, target)
    ui_path = target / "ui-document.json"
    spec_path = target / "prototype-spec.json"
    fixture_path = target / "state-fixture.json"
    ui = json.loads(ui_path.read_text())
    spec = json.loads(spec_path.read_text())
    fixture = json.loads(fixture_path.read_text())
    state_id = STATE_IDS[spec["state_id"]]
    spec["state_id"] = fixture["state_id"] = state_id
    tokens = ui["tokens"]
    texts = text_ids(ui)
    stable_ids = []
    for screen in ui["acceptance"]:
        for item in screen["targets"]:
            props = [
                name for name in item["properties"]
                if name not in INVISIBLE_PROPERTIES.get(item["stable_id"], set())
            ]
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
            {"stable_id": "preferences.save", "color": tokens["color.brand"]["value"]},
        ],
        "max_bounds_delta_px": 1,
    }
    ui_path.write_text(json.dumps(ui, ensure_ascii=False, indent=2) + "\n")
    spec_path.write_text(json.dumps(spec, ensure_ascii=False, indent=2) + "\n")
    fixture_path.write_text(json.dumps(fixture, ensure_ascii=False, indent=2) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("target", type=Path)
    args = parser.parse_args()
    derive(args.source, args.target)


if __name__ == "__main__":
    main()
