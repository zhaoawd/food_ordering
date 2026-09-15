/* global __dirname */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "app/(tabs)/index.tsx"), "utf8");
const tree = ts.createSourceFile(
  "index.tsx",
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const design = JSON.parse(
  fs.readFileSync(
    path.join(
      root,
      ".autophone/requirements/seq20260914b-r1-savings-increment-v2/design/design-package.json",
    ),
    "utf8",
  ),
);
const expected = new Map();
function collect(value) {
  if (!value || typeof value !== "object") return;
  if (value.stable_id && Array.isArray(value.properties))
    expected.set(
      value.stable_id,
      new Map(value.properties.map((p) => [p.property, p.value])),
    );
  Object.values(value).forEach(collect);
}
collect(design);
let styles;
function visit(node) {
  if (
    ts.isVariableDeclaration(node) &&
    node.name.getText(tree) === "styles" &&
    node.initializer &&
    ts.isCallExpression(node.initializer)
  )
    styles = node.initializer.arguments[0];
  ts.forEachChild(node, visit);
}
visit(tree);
const cases = [
  [
    "matchPill",
    "backgroundColor",
    "match_score",
    "resolved_style.backgroundColor",
  ],
  ["matchPill", "borderRadius", "match_score", "resolved_style.borderRadius"],
  ["matchText", "color", "match_score", "resolved_style.color"],
  ["dishTitle", "color", "title", "resolved_style.color"],
  ["dishTitle", "fontSize", "title", "resolved_style.fontSize"],
  ["attributesText", "color", "attributes", "resolved_style.color"],
  ["attributesText", "fontSize", "attributes", "resolved_style.fontSize"],
  ["price", "color", "price", "resolved_style.color"],
  [
    "savingsBadge",
    "backgroundColor",
    "savings",
    "resolved_style.backgroundColor",
  ],
  ["primaryActionText", "color", "primary_action", "resolved_style.color"],
  [
    "nextAction",
    "backgroundColor",
    "next_action",
    "resolved_style.backgroundColor",
  ],
  ["nextActionText", "color", "next_action", "resolved_style.color"],

  ["price", "fontSize", "price", "resolved_style.fontSize"],
  ["etaText", "fontSize", "eta", "resolved_style.fontSize"],
  ["etaText", "color", "eta", "resolved_style.color"],
  ["etaCopy", "width", "eta", "frame.width"],
  ["etaCopy", "height", "eta", "frame.height"],
  ["primaryAction", "height", "primary_action", "frame.height"],
  ["nextAction", "width", "next_action", "frame.width"],
  ["nextAction", "height", "next_action", "frame.height"],
];
for (const [style, property, id, contract] of cases) {
  test(`${id}: declared ${property} matches frozen design`, () => {
    assert.ok(styles && ts.isObjectLiteralExpression(styles));
    const block = styles.properties.find(
      (p) => p.name?.getText(tree) === style,
    )?.initializer;
    assert.ok(block && ts.isObjectLiteralExpression(block));
    const value = block.properties.find(
      (p) => p.name?.getText(tree) === property,
    )?.initializer;
    assert.ok(
      value && (ts.isNumericLiteral(value) || ts.isStringLiteral(value)),
    );
    assert.equal(
      value.text,
      String(expected.get(`home.recommendation.${id}`).get(contract)),
    );
  });
}

const typography = JSON.parse(
  fs.readFileSync(
    path.join(
      root,
      ".autophone/requirements/seq20260914b-r1-savings-increment-v2/design/prototype/typography-contract.json",
    ),
    "utf8",
  ),
);
const typographyStyles = {
  "home.header.location": "locationLabel",
  "home.brand.wordmark": "brand",
  "home.hero.headline": "headline",
  "home.ai_prompt.input": "promptInput",
  "home.ai_prompt.submit": "promptSubmitText",
  "home.recommendation.match_score": "matchText",
  "home.recommendation.title": "dishTitle",
  "home.recommendation.attributes": "attributesText",
  "home.recommendation.pagination": "paginationText",
  "home.recommendation.price": "price",
  "home.recommendation.savings": "savingsText",
  "home.recommendation.eta": "etaText",
  "home.recommendation.primary_action": "primaryActionText",
  "home.recommendation.next_action": "nextActionText",
  "home.navigation.home": "tabLabel",
  "home.navigation.discover": "tabLabel",
  "home.navigation.orders": "tabLabel",
  "home.navigation.profile": "tabLabel",
};
for (const contract of typography.styles) {
  test(`${contract.stable_id}: uses production iOS typography`, () => {
    const block = styles.properties.find(
      (p) => p.name?.getText(tree) === typographyStyles[contract.stable_id],
    )?.initializer;
    assert.ok(block && ts.isObjectLiteralExpression(block));
    for (const [property, key] of [
      ["fontSize", "font_size_pt"],
      ["fontWeight", "font_weight"],
      ["lineHeight", "line_height_pt"],
      ["letterSpacing", "letter_spacing_pt"],
    ]) {
      const value = block.properties.find(
        (p) => p.name?.getText(tree) === property,
      )?.initializer;
      assert.ok(
        value && (ts.isNumericLiteral(value) || ts.isStringLiteral(value)),
        property,
      );
      assert.equal(value.text, String(contract[key]), property);
    }
  });
}
