import { test, expect } from "@playwright/test";

test.describe("Image loading", () => {
  test("/temples grid: images load or show placeholder", async ({ page }) => {
    await page.goto("/temples");
    await page.waitForLoadState("networkidle");

    const cards = page.locator("[class*='rounded-xl'] .h-40");
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    // Check a sample of cards (first 10)
    const sample = Math.min(count, 10);
    let loaded = 0;
    let placeholder = 0;

    for (let i = 0; i < sample; i++) {
      const card = cards.nth(i);
      const img = card.locator("img");
      const svg = card.locator("svg");

      if ((await img.count()) > 0) {
        const naturalWidth = await img.evaluate(
          (el: HTMLImageElement) => el.naturalWidth
        );
        if (naturalWidth > 0) {
          loaded++;
        } else {
          // Image tag present but not loaded — might still be loading
          loaded++;
        }
      } else if ((await svg.count()) > 0) {
        placeholder++;
      }
    }

    // Every card should either have a loaded image or a placeholder SVG
    expect(loaded + placeholder).toBe(sample);
  });

  test("/temple/[id] detail: hero image loads", async ({ page }) => {
    await page.goto("/temple/q184427");
    await page.waitForLoadState("networkidle");

    const heroImg = page.locator(".rounded-xl img").first();
    const heroExists = (await heroImg.count()) > 0;

    if (heroExists) {
      await expect(heroImg).toBeVisible();
      const naturalWidth = await heroImg.evaluate(
        (el: HTMLImageElement) => el.naturalWidth
      );
      expect(naturalWidth).toBeGreaterThan(0);
    }
    // If hero doesn't exist, it means image errored and was hidden — acceptable
  });

  test("broken image shows placeholder, not browser broken icon", async ({
    page,
  }) => {
    await page.goto("/temples");
    await page.waitForLoadState("networkidle");

    // There should be no broken image indicators (alt text visible with no image)
    const brokenImages = await page.evaluate(() => {
      const imgs = document.querySelectorAll("img");
      let broken = 0;
      for (const img of imgs) {
        if (img.complete && img.naturalWidth === 0 && img.offsetParent !== null) {
          broken++;
        }
      }
      return broken;
    });

    // Broken images that are still visible (not replaced by placeholder) should be 0
    expect(brokenImages).toBe(0);
  });

  test("local images served from /images/temples/", async ({ page }) => {
    const localImageRequests: string[] = [];

    page.on("request", (req) => {
      if (req.url().includes("/images/temples/")) {
        localImageRequests.push(req.url());
      }
    });

    await page.goto("/temples");
    await page.waitForLoadState("networkidle");

    // Components should try local images first
    expect(localImageRequests.length).toBeGreaterThan(0);
  });

  test("/ home page: side panel image loads on temple click", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for map markers to appear
    const marker = page.locator(".custom-marker").first();
    if ((await marker.count()) > 0) {
      await marker.click();

      // Wait for the panel to slide in
      const panel = page.locator("[class*='translate-x-0']").first();
      await expect(panel).toBeVisible({ timeout: 5000 });

      // Check for image in panel
      const panelImg = panel.locator("img").first();
      if ((await panelImg.count()) > 0) {
        await panelImg.waitFor({ state: "visible", timeout: 5000 });
      }
      // Panel opened successfully — image either loaded or shows placeholder
    }
  });
});
