const { test, expect } = require("@playwright/test");
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("home.recommendation.savings")).toBeVisible();
});
test("price row renders without overlap and matches corrected dimensions", async ({
  page,
}, testInfo) => {
  const ids = ["price", "savings", "eta"];
  const boxes = [];
  for (const id of ids)
    boxes.push(
      await page.getByTestId(`home.recommendation.${id}`).boundingBox(),
    );
  expect(boxes.map((b) => b.width)).toEqual([56, 120, 163]);
  expect(boxes[1].height).toBe(26);
  expect(boxes[2].height).toBe(18);
  expect(boxes[0].x + boxes[0].width).toBeLessThanOrEqual(boxes[1].x);
  expect(boxes[1].x + boxes[1].width).toBeLessThanOrEqual(boxes[2].x);
  expect(boxes[2].x + boxes[2].width).toBeLessThanOrEqual(430);
  await expect(page.getByTestId("home.recommendation.eta")).toHaveText(
    "25–35 分钟 · 预计送达",
  );
  const next = await page
    .getByTestId("home.recommendation.next_action")
    .boundingBox();
  expect(next.width).toBe(386);
  expect(next.height).toBe(28);
  expect(next.y).toBe(826);
  const nav = await page.getByTestId("home.navigation").boundingBox();
  expect(next.y + next.height).toBeLessThanOrEqual(nav.y);
  await page.screenshot({ path: testInfo.outputPath("r1-component.png") });
  expect(
    (await page.getByTestId("home.recommendation.primary_action").boundingBox())
      .height,
  ).toBe(46);
});
test("switching recommendation retains badge and updates price and ETA", async ({
  page,
}) => {
  await page.getByTestId("home.recommendation.next_action").click();
  await expect(page.getByTestId("home.recommendation.savings")).toHaveText(
    "限时立减 ¥4",
  );
  await expect(page.getByTestId("home.recommendation.savings")).toHaveAttribute(
    "aria-label",
    "限时立减 ¥4",
  );
  await expect(page.getByTestId("home.recommendation.price")).toHaveText("¥29");
  await expect(page.getByTestId("home.recommendation.eta")).toHaveText(
    "20–30 分钟 · 预计送达",
  );
  await page.getByTestId("home.recommendation.next_action").click();
  await expect(page.getByTestId("home.recommendation.savings")).toHaveText(
    "限时立减 ¥6",
  );
});
test("order action updates bag count and orders tab requests existing route", async ({
  page,
}) => {
  await page.getByTestId("home.recommendation.primary_action").click();
  await expect(page.getByTestId("home.header.cart_badge")).toHaveText("3");
  await expect(
    page.getByTestId("home.recommendation.primary_action"),
  ).toHaveText("立即下单");
  await page.getByTestId("home.navigation.orders").click();
  await expect
    .poll(() => page.evaluate(() => window.__lastRoute))
    .toBe("/cart");
});

test("record full design-scope browser geometry for diagnosis", async ({
  page,
}, testInfo) => {
  const fs = require("node:fs");
  const path = require("node:path");
  const design = JSON.parse(
    fs.readFileSync(
      path.resolve(
        process.cwd(),
        ".autophone/requirements/seq20260914b-r1-savings-increment-v2/design/design-package.json",
      ),
      "utf8",
    ),
  );
  const elements = [];
  for (const stableId of design.node_scope) {
    const locator = page.getByTestId(stableId);
    await expect(locator).toHaveCount(1);
    elements.push(
      await locator.evaluate((element, stable_id) => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          stable_id,
          text: element.textContent,
          frame: { x: box.x, y: box.y, width: box.width, height: box.height },
          browser_style: {
            color: style.color,
            backgroundColor: style.backgroundColor,
            fontSize: style.fontSize,
            borderRadius: style.borderRadius,
          },
        };
      }, stableId),
    );
  }
  const record = {
    status: "diagnostic_only",
    boundary:
      "Browser component harness with native boundaries replaced; not iOS Actual or independent device coverage.",
    elements,
  };
  fs.writeFileSync(
    testInfo.outputPath("full-scope-browser.json"),
    JSON.stringify(record, null, 2),
  );
});

test("R1 frames retain their geometry with the BL-202 preferences button reservation", async ({
  page,
}) => {
  const fs = require("node:fs");
  const design = JSON.parse(
    fs.readFileSync(
      ".autophone/requirements/seq20260914b-r1-savings-increment-v2/design/design-package.json",
      "utf8",
    ),
  );
  const expected = [];
  function walk(value) {
    if (!value || typeof value !== "object") return;
    if (value.stable_id && Array.isArray(value.properties))
      expected.push(value);
    Object.values(value).forEach(walk);
  }
  walk(design);
  for (const element of expected) {
    const box = await page.getByTestId(element.stable_id).boundingBox();
    for (const property of element.properties) {
      if (property.property.startsWith("frame.")) {
        const key = property.property.slice(6);
        expect
          .soft(
            Math.abs(box[key] - (Number(property.value) -
              (element.stable_id === "home.ai_prompt.input" && key === "width" ? 44 : 0))),
            element.stable_id + "." + key,
          )
          .toBeLessThanOrEqual(0.51);
      }
    }
  }
});

// BL-202 reserves a 44-point target within the existing prompt row.
test("preferences entry fits between input and submit and opens preferences", async ({ page }) => {
  const input = await page.getByTestId("home.ai_prompt.input").boundingBox();
  const preferences = page.getByRole("button", { name: "调偏好", exact: true });
  const button = await preferences.boundingBox();
  const submit = await page.getByTestId("home.ai_prompt.submit").boundingBox();
  expect(button.width).toBe(44);
  expect(input.x + input.width).toBeLessThanOrEqual(button.x + 0.01);
  expect(button.x + button.width).toBeLessThanOrEqual(submit.x + 0.01);
  await preferences.click();
  await expect.poll(() => page.evaluate(() => window.__lastRoute)).toBe("/preferences");
});
