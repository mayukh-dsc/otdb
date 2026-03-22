import { test, expect } from "@playwright/test";

test.describe("Visualization pages", () => {
  test("floor plan tab has no raw HTML in captions", async ({ page }) => {
    await page.goto("/temple/q3437182");
    await page.waitForLoadState("networkidle");

    // Click Floor Plan tab
    const floorPlanTab = page.getByRole("button", { name: "Floor Plan" });
    await floorPlanTab.click();

    // Wait for content to render
    await page.waitForTimeout(500);

    const content = await page.locator("[class*='rounded-xl']").allTextContents();
    const allText = content.join(" ");

    // No raw HTML tags should be visible as text
    expect(allText).not.toContain("<div");
    expect(allText).not.toContain("</div>");
    expect(allText).not.toContain('<div class="fn">');
  });

  test("floor plan tab does not render non-image files", async ({ page }) => {
    await page.goto("/temple/q3437182");
    await page.waitForLoadState("networkidle");

    const floorPlanTab = page.getByRole("button", { name: "Floor Plan" });
    await floorPlanTab.click();
    await page.waitForTimeout(500);

    // Check that no img src points to a non-image file
    const imgSrcs = await page.locator("img").evaluateAll((imgs) =>
      (imgs as HTMLImageElement[]).map((img) => img.src)
    );

    for (const src of imgSrcs) {
      expect(src).not.toMatch(/\.(djvu|pdf|tiff?|svg)(\?|$)/i);
    }
  });

  test("blueprint tab has no raw HTML in captions", async ({ page }) => {
    await page.goto("/temple/q3437182");
    await page.waitForLoadState("networkidle");

    const blueprintTab = page.getByRole("button", { name: "Blueprint" });
    await blueprintTab.click();
    await page.waitForTimeout(500);

    const content = await page.locator("[class*='rounded-xl']").allTextContents();
    const allText = content.join(" ");

    expect(allText).not.toContain("<div");
    expect(allText).not.toContain("</div>");
  });

  test("blueprint tab does not render non-image files", async ({ page }) => {
    await page.goto("/temple/q3437182");
    await page.waitForLoadState("networkidle");

    const blueprintTab = page.getByRole("button", { name: "Blueprint" });
    await blueprintTab.click();
    await page.waitForTimeout(500);

    const imgSrcs = await page.locator("img").evaluateAll((imgs) =>
      (imgs as HTMLImageElement[]).map((img) => img.src)
    );

    for (const src of imgSrcs) {
      expect(src).not.toMatch(/\.(djvu|pdf|tiff?|svg)(\?|$)/i);
    }
  });

  test("temple detail tabs are navigable", async ({ page }) => {
    await page.goto("/temple/q3437182");
    await page.waitForLoadState("networkidle");

    // All 4 tabs should be present
    for (const tabName of ["Overview", "Floor Plan", "Engineering", "Blueprint"]) {
      const tab = page.getByRole("button", { name: tabName });
      await expect(tab).toBeVisible();
      await tab.click();
      await page.waitForTimeout(300);
    }
  });
});
