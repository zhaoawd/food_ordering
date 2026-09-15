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
    "限时立减 4 元",
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
