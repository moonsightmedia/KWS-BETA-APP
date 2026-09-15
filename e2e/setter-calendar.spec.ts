import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const output = "test-results/setter-calendar-20260915";
const loop = process.env.KWS_QA_LOOP || "loop2";
test.use({ timezoneId: "Europe/Berlin", trace: "off", video: "off" });

async function openPage(page: Page, name = "schedule", extra = "&calendar") {
  await page.clock.setFixedTime(new Date("2026-09-15T08:00:00Z"));
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
  for (const hook of [
    "useAuth",
    "useColors",
    "useSectors",
    "useBoulders",
    "useBoulderCommunity",
    "useSectorSchedule",
    "useHallMaps",
  ]) {
    await page.route(`**/src/hooks/${hook}.ts*`, (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: "export * from '/test/fixtures/setter-hooks.ts';",
      }),
    );
  }
  await page.route("**/src/contexts/UploadContext.tsx*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "export { useUpload } from '/test/fixtures/setter-hooks.ts';",
    }),
  );
  await page.goto(`/test/fixtures/setter-workspace.html?page=${name}${extra}`);
  await expect(page.locator("h1")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}
const day = (page: Page, name: string) =>
  page.getByRole("gridcell", {
    name: new RegExp(`^[^,]+, ${name.replaceAll(".", "\\.")}(?:,| ·)`),
  });

test("empty day prefills form, cancel returns focus, creation keeps local day and all physical IDs", async ({
  page,
}) => {
  await openPage(page);
  const target = day(page, "19. September 2026");
  await target.click();
  await expect(
    page.getByRole("button", { name: "Datum wählen", exact: true }),
  ).toContainText("19. September 2026");
  await page.getByRole("button", { name: "Abbrechen", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(target).toBeFocused();
  await target.press("Enter");
  await page.getByRole("button", { name: "Bug A", exact: true }).click();
  await page.getByLabel("Uhrzeit", { exact: true }).fill("23:30");
  await page
    .getByRole("button", { name: "Termin erstellen", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const writes = await page.evaluate(() => window.setterQA.writes);
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({
    kind: "create-schedule",
    payload: { scheduledAt: "2026-09-19T21:30:00.000Z" },
  });
  expect((writes[0].payload as { sectorIds: string[] }).sectorIds).toHaveLength(
    2,
  );
  await expect(day(page, "19. September 2026")).toHaveAttribute(
    "aria-label",
    /1 Termin anzeigen/,
  );
  await expect(
    page.getByRole("region", { name: "Tagesplanung" }),
  ).toContainText("23:30");
});

test("occupied days open agenda, further appointment and delete stay explicit, UTC midnight maps locally", async ({
  page,
}) => {
  await openPage(page);
  await day(page, "16. September 2026").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const agenda = page.getByRole("region", { name: "Tagesplanung" });
  await expect(agenda.locator("article")).toHaveCount(3);
  await expect(agenda).toContainText("10:00");
  await page
    .getByRole("button", { name: "Termin hinzufügen", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Datum wählen", exact: true }),
  ).toContainText("16. September 2026");
  await page.getByRole("button", { name: "Abbrechen", exact: true }).click();
  await agenda.getByRole("button", { name: "Termin Bug A löschen" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("keine Boulder");
  expect(await page.evaluate(() => window.setterQA.writes)).toEqual([]);
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Löschen", exact: true })
    .click();
  expect((await page.evaluate(() => window.setterQA.writes))[0]).toMatchObject({
    kind: "delete-schedule",
    payload: ["cal-0", "cal-1"],
  });
  await expect(agenda.locator("article")).toHaveCount(2);
  await day(page, "18. September 2026").click();
  await expect(agenda).toContainText("00:30");
  await expect(day(page, "17. September 2026")).toHaveAttribute(
    "aria-label",
    /Termin hinzufügen/,
  );
});

test("month and year boundaries, today, past days, keyboard movement and list view", async ({
  page,
}) => {
  await openPage(page);
  await page
    .getByRole("button", { name: "Nächster Monat", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Oktober 2026", exact: true }),
  ).toBeVisible();
  await day(page, "1. Oktober 2026").click();
  await expect(
    page.getByRole("region", { name: "Tagesplanung" }).locator("article"),
  ).toHaveCount(1);
  for (let i = 0; i < 3; i++)
    await page
      .getByRole("button", { name: "Nächster Monat", exact: true })
      .click();
  await expect(
    page.getByRole("heading", { name: "Januar 2027", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Heute", exact: true }).click();
  const today = day(page, "15. September 2026");
  await today.focus();
  await today.press("ArrowRight");
  await expect(day(page, "16. September 2026")).toBeFocused();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("region", { name: "Tagesplanung" }).locator("article"),
  ).toHaveCount(3);
  await page
    .getByRole("button", { name: "Vorheriger Monat", exact: true })
    .click();
  await day(page, "31. August 2026").click();
  await expect(
    page.getByRole("button", { name: "Termin hinzufügen", exact: true }),
  ).toHaveCount(0);
  await day(page, "30. August 2026").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Liste", exact: true }).click();
  await page.getByRole("button", { name: "Vergangen", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /31. August 2026/ }),
  ).toBeVisible();
  expect(await page.evaluate(() => window.setterQA.writes)).toEqual([]);
});

test("past time is rejected and changed prefilled form has discard protection", async ({
  page,
}) => {
  await openPage(page);
  await day(page, "15. September 2026").click();
  await page.getByRole("button", { name: "Bug A", exact: true }).click();
  await page.getByLabel("Uhrzeit", { exact: true }).fill("09:00");
  await page
    .getByRole("button", { name: "Termin erstellen", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("zukünftigen Zeitpunkt");
  await page.getByRole("button", { name: "Abbrechen", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toContainText(
    "Termin verwerfen?",
  );
  await page.getByRole("button", { name: "Verwerfen", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await page.evaluate(() => window.setterQA.writes)).toEqual([]);
});

test("status groups collapse individually and together, selection remains explicit and clears on filters", async ({
  page,
}) => {
  await openPage(page, "status", "");
  const group = page
    .getByRole("heading", { name: /^Bug A/ })
    .getByRole("button");
  await page
    .getByRole("checkbox", { name: "Blauer Horizont auswählen", exact: true })
    .check();
  await group.focus();
  await group.press("Enter");
  await expect(group).toHaveAttribute("aria-expanded", "false");
  await expect(group).toContainText("1 ausgewählt");
  await expect(
    page.getByRole("checkbox", {
      name: "Blauer Horizont auswählen",
      exact: true,
    }),
  ).toBeHidden();
  await expect(
    page.getByText(
      "1 ausgewählte Boulder in eingeklappten Gruppen. Die Auswahl bleibt aktiv.",
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Alle einklappen", exact: true })
    .click();
  await expect(page.locator("article:visible")).toHaveCount(0);
  await page.getByRole("button", { name: "Abschrauben", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toContainText(
    "1 ausgewählte Boulder",
  );
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Abbrechen", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Alle ausklappen", exact: true })
    .click();
  await expect(page.locator("article:visible")).toHaveCount(12);
  await expect(
    page.getByRole("checkbox", {
      name: "Blauer Horizont auswählen",
      exact: true,
    }),
  ).toBeChecked();
  await page.getByRole("button", { name: /^Abgeschraubt 4$/ }).click();
  await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(0);
  await expect(page.locator("article:visible")).toHaveCount(4);
  expect(await page.evaluate(() => window.setterQA.writes)).toEqual([]);
});

for (const width of [375, 768, 1280, 1920]) {
  test(`calendar and collapsed status visual ${width}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await openPage(page);
    await day(page, "16. September 2026").click();
    await mkdir(output, { recursive: true });
    await page.screenshot({
      path: `${output}/${loop}-calendar-${width}.png`,
      animations: "disabled",
      fullPage: true,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    const bounds = await day(page, "19. September 2026").boundingBox();
    expect(bounds!.width).toBeGreaterThanOrEqual(44);
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    await day(page, "19. September 2026").click();
    await expect(
      page.getByRole("button", { name: "Termin erstellen", exact: true }),
    ).toBeInViewport();
    await page.screenshot({
      path: `${output}/${loop}-form-${width}.png`,
      animations: "disabled",
    });
    await page.getByRole("button", { name: "Abbrechen", exact: true }).click();
    await page.goto("/test/fixtures/setter-workspace.html?page=status");
    await page
      .getByRole("button", { name: "Alle einklappen", exact: true })
      .click();
    await page
      .getByRole("heading", { name: /^Bug A/ })
      .getByRole("button")
      .click();
    await page.screenshot({
      path: `${output}/${loop}-status-${width}.png`,
      animations: "disabled",
      fullPage: true,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => window.setterQA.writes)).toEqual([]);
  });
}

test("empty calendar is usable and load errors do not pretend to be zero appointments", async ({
  page,
}) => {
  await openPage(page, "schedule", "&empty");
  await expect(page.getByRole("grid")).toBeVisible();
  await day(page, "19. September 2026").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.goto("/test/fixtures/setter-workspace.html?page=schedule&error");
  await expect(page.getByRole("alert")).toContainText(
    "Planung konnte nicht geladen werden",
  );
  await expect(page.getByRole("grid")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Neuer Termin", exact: true }),
  ).toBeDisabled();
});
