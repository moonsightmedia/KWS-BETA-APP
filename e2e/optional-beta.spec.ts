import { expect, test, type Page } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
const output = "test-results/optional-beta-20261012";
test.use({ trace: "off", video: "off" });

async function createPage(page: Page) {
  await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
  for (const hook of ["useAuth", "useColors", "useSectors", "useBoulders", "useBoulderCommunity", "useHallMaps"]) {
    await page.route(`**/src/hooks/${hook}.ts*`, route => route.fulfill({ contentType: "application/javascript", body: "export * from '/test/fixtures/setter-hooks.ts';" }));
  }
  await page.route("**/src/contexts/UploadContext.tsx*", route => route.fulfill({ contentType: "application/javascript", body: "export { useUpload } from '/test/fixtures/setter-hooks.ts';" }));
  await page.route("**/src/lib/authenticatedFetch.ts*", route => route.fulfill({ contentType: "application/javascript", body: "export const authenticatedFetch = (...args) => window.fetch(...args); export const getCurrentSession = async () => ({ access_token: 'fixture-only' });" }));
  await page.goto("/test/fixtures/setter-workspace.html?page=create");
  await page.getByRole("button", { name: "Boulder hinzufügen", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Beta kommt später");
  await page.getByLabel("Vorschaubild", { exact: true }).setInputFiles({
    name: "photo.png", mimeType: "image/png", buffer: await readFile("src/assets/boulderkarte-original.png"),
  });
  await page.getByRole("combobox", { name: "Sektor wählen", exact: true }).click();
  await page.getByRole("option").first().click();
}
test("explicit no-video choice, publication after thumbnail and no fake video upload", async ({ page }) => {
  await createPage(page);
  await page.getByRole("button", { name: "Zum Stapel hinzufügen", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Pflichtfelder");
  await page.getByRole("checkbox", { name: /Beta später ergänzen/ }).check();
  await page.getByRole("button", { name: "Zum Stapel hinzufügen", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Bereit · Beta folgt")).toBeVisible();
  const requests: string[] = [];
  await page.route("**/qa/rest/v1/boulders*", async route => {
    const request = route.request();
    requests.push(request.method());
    if (request.method() === "POST") {
      expect(request.postDataJSON().beta_video_status).toBe("uploading");
      expect(request.postDataJSON().beta_video_url).toBeUndefined();
      await route.fulfill({ contentType: "application/json", body: JSON.stringify([{ id: "created-1", name: "Beta kommt später" }]) });
    } else {
      expect(await page.evaluate(() => window.setterQA.uploads)).toEqual(["thumbnail"]);
      expect(await page.evaluate(() => window.setterQA.writes.map(w => w.kind))).toEqual(["upload-start", "upload-wait"]);
      expect(new URL(request.url()).searchParams.get("thumbnail_url")).toBe("not.is.null");
      expect(request.postDataJSON()).toEqual({ beta_video_status: "none" });
      await route.fulfill({ contentType: "application/json", body: JSON.stringify([{ id: "created-1", thumbnail_url: "/photo.png", beta_video_status: "none" }]) });
    }
  });
  await page.getByRole("button", { name: "1 Boulder hochladen", exact: true }).click();
  await expect(page.getByText("1 Boulder übertragen", { exact: true })).toBeVisible();
  expect(requests).toEqual(["POST", "PATCH"]);
  expect(await page.evaluate(() => window.setterQA.uploads)).toEqual(["thumbnail"]);
});
test("unconfirmed publication keeps draft and reports failure", async ({ page }) => {
  await createPage(page);
  await page.getByRole("checkbox", { name: /Beta später ergänzen/ }).check();
  await page.getByRole("button", { name: "Zum Stapel hinzufügen", exact: true }).click();
  await page.route("**/qa/rest/v1/boulders*", route => route.fulfill({ contentType: "application/json", body: JSON.stringify(route.request().method() === "POST" ? [{ id: "created-1" }] : []) }));
  await page.route("**/qa/rest/v1/rpc/**", route => route.fulfill({ contentType: "application/json", body: "null" }));
  await page.getByRole("button", { name: "1 Boulder hochladen", exact: true }).click();
  await expect(page.getByText(/Fehlgeschlagen – Entwurf prüfen/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Beta kommt später bearbeiten", exact: true })).toBeEnabled();
  await expect(page.getByText("1 Boulder übertragen", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "1 Boulder hochladen", exact: true })).toBeDisabled();
  await expect(page.getByRole("link", { name: /Vorhandenen Boulder/ })).toHaveAttribute("href", "/setter/edit");
});
test("thumbnail failure never publishes a no-video Boulder", async ({ page }) => {
  await createPage(page);
  await page.getByRole("checkbox", { name: /Beta später ergänzen/ }).check();
  await page.getByRole("button", { name: "Zum Stapel hinzufügen", exact: true }).click();
  let published = false;
  await page.route("**/qa/rest/v1/boulders*", route => {
    if (route.request().method() === "PATCH") published = true;
    return route.fulfill({ contentType: "application/json", body: JSON.stringify([{ id: "created-1" }]) });
  });
  await page.route("**/qa/rest/v1/rpc/**", route => route.fulfill({ contentType: "application/json", body: "null" }));
  await page.evaluate(() => { window.setterQA.fail = true; });
  await page.getByRole("button", { name: "1 Boulder hochladen", exact: true }).click();
  await expect(page.getByText(/Fehlgeschlagen – Entwurf prüfen/)).toBeVisible();
  expect(published).toBe(false);
  expect(await page.evaluate(() => window.setterQA.uploads)).toEqual([]);
});
test("existing no-video Boulder saves without forcing media and can receive a real Beta", async ({ page }) => {
  await createPage(page);
  await page.goto("/test/fixtures/setter-workspace.html?page=edit&withoutVideo");
  await page.getByRole("button", { name: "Grüne Welle bearbeiten", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: /Beta später ergänzen/ })).toBeChecked();
  await page.getByLabel("Name", { exact: true }).fill("Ohne Beta bearbeitet");
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await page.evaluate(() => window.setterQA.uploads)).toEqual([]);
  await page.getByRole("button", { name: "Grüne Welle bearbeiten", exact: true }).click();
  await page.getByLabel("Video", { exact: true }).setInputFiles({ name: "beta.mp4", mimeType: "video/mp4", buffer: Buffer.from("isolated mocked video") });
  await expect(page.getByRole("checkbox", { name: /Beta später ergänzen/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await page.evaluate(() => window.setterQA.uploads)).toEqual(["video"]);
});
for (const confirmed of [true, false]) test(`repair failed no-video publication: confirmed=${confirmed}`, async ({ page }) => {
  await createPage(page);
  await page.goto("/test/fixtures/setter-workspace.html?page=edit&withoutVideo&failedPublication");
  let publications = 0;
  await page.route("**/qa/rest/v1/boulders*", route => {
    expect(route.request().method()).toBe("PATCH");
    expect(new URL(route.request().url()).searchParams.get("id")).toBe("eq.b-0");
    publications++;
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(confirmed
      ? [{ id: "b-0", thumbnail_url: "/photo.png", beta_video_status: "none" }] : []) });
  });
  await page.getByRole("button", { name: "Grüne Welle bearbeiten", exact: true }).click();
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  if (confirmed) await expect(page.getByRole("dialog")).toHaveCount(0);
  else {
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("alert")).toContainText("Veröffentlichung nicht bestätigt");
  }
  expect(publications).toBe(1);
  expect(await page.evaluate(() => window.setterQA.uploads)).toEqual([]);
});
for (const loop of [1, 2]) for (const width of [375, 768, 1280, 1920]) test(`visual loop ${loop} at ${width}px`, async ({ page }) => {
  await mkdir(output, { recursive: true });
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/test/fixtures/beta-placeholder.html?withThumbnail");
  const placeholder = page.locator("[data-beta-placeholder]");
  await expect(placeholder).toContainText("Hier waren wir noch zu schwach.");
  await expect(page.locator("video")).toHaveCount(0);
  await expect(page.getByText("Offizielle Beta")).toHaveCount(0);
  await expect(page.getByRole("img", { name: "Startgriffe von Grüne Welle" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `${output}/loop${loop}-placeholder-${width}.png` });
  if (loop === 2) {
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await page.locator(".beta-placeholder-climber").evaluate(e => getComputedStyle(e).animationName)).toBe("none");
  }
  await createPage(page);
  await page.getByRole("checkbox", { name: /Beta später ergänzen/ }).check();
  await expect(page.getByRole("checkbox", { name: /Beta später ergänzen/ })).toBeChecked();
  await page.getByRole("checkbox", { name: /Beta später ergänzen/ }).uncheck();
  await expect(page.getByRole("checkbox", { name: /Beta später ergänzen/ })).not.toBeChecked();
  await page.getByRole("checkbox", { name: /Beta später ergänzen/ }).check();
  await page.screenshot({ path: `${output}/loop${loop}-editor-${width}.png` });
});
for (const mode of ["page", "dialog"]) for (const width of [375, 768, 1280, 1920]) test(`real ${mode} media area ${width}px`, async ({ page }) => {
  await mkdir(output, { recursive: true });
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
  for (const hook of ["useAuth", "useColors", "useBoulders"]) {
    await page.route(`**/src/hooks/${hook}.ts*`, route => route.fulfill({ contentType: "application/javascript", body: "export * from '/test/fixtures/setter-hooks.ts';" }));
  }
  await page.route("**/src/components/boulder/BoulderDetailSections.tsx*", route => route.fulfill({ contentType: "application/javascript",
    body: "export const BoulderInfoTab=()=>null; export const BoulderBetaTab=()=>null; export const BoulderTrackTab=()=>null;" }));
  await page.route("**/src/components/BoulderCommunityPanel.tsx*", route => route.fulfill({ contentType: "application/javascript",
    body: "export const BoulderBetaPreview=()=>null; export const BoulderStatsPanel=()=>null; export const BoulderTrackingPanel=()=>null;" }));
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`/test/fixtures/beta-placeholder.html?mode=${mode}&withoutVideo&guest`);
  await expect(page.locator("[data-beta-placeholder]")).toBeVisible();
  await expect(page.locator("video,iframe")).toHaveCount(0);
  await expect(page.getByText("Offizielle Beta", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Videoqualität|Vollbild/ })).toHaveCount(0);
  if (mode === "dialog") await page.getByRole("dialog").evaluate(async element => {
    await Promise.all(element.getAnimations().map(animation => animation.finished.catch(() => undefined)));
  });
  await page.screenshot({ path: `${output}/actual-${mode}-${width}.png` });
  expect(errors).toEqual([]);
});
