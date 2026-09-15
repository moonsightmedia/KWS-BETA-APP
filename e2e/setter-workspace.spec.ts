import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { readFile } from "node:fs/promises";
const output = "test-results/setter-workspace-20260914";
const baseline = process.env.KWS_SETTER_BASELINE === "1";
const loop = baseline ? "before" : process.env.KWS_QA_LOOP || "loop1";
test.use({ trace: 'off', video: 'off' });

test.describe('isolated upload orchestration', () => {
  test('two drafts stay serial, lock controls and report transfer progress', async ({ page }) => {
    test.skip(baseline);
    await openPage(page, 'create');
    // Replace only the endpoint expressions in the served test module; no production service receives a request.
    await page.route('**/src/components/setter/BatchUpload.tsx*', async route => {
      const response = await route.fetch();
      const body = (await response.text()).replaceAll('import.meta.env.VITE_SUPABASE_URL', JSON.stringify('http://127.0.0.1:4173/qa')).replaceAll('import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY', JSON.stringify('fixture-only'));
      await route.fulfill({ response, body });
    });
    await page.reload();
    let created = 0;
    await page.route('**/qa/rest/v1/boulders', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ id: `created-${++created}`, name: 'Testboulder' }]) }));
    const png = await readFile('src/assets/boulderkarte-original.png');
    for (const name of ['Stapel eins', 'Stapel zwei']) {
      await page.getByRole('button', { name: 'Boulder hinzufügen', exact: true }).click();
      await page.getByLabel('Name', { exact: true }).fill(name);
      await page.getByLabel('Video', { exact: true }).setInputFiles({ name: 'test-video.mp4', mimeType: 'video/mp4', buffer: Buffer.from('isolated mocked upload') });
      await page.getByLabel('Vorschaubild', { exact: true }).setInputFiles({ name: 'test-image.png', mimeType: 'image/png', buffer: png });
      await page.getByRole('combobox', { name: 'Sektor wählen', exact: true }).click();
      await page.getByRole('option').first().click();
      await page.getByRole('button', { name: 'Zum Stapel hinzufügen', exact: true }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
    expect(await page.evaluate(() => window.setterQA.writes)).toEqual([]);
    await page.setViewportSize({ width: 375, height: 900 });
    const fabBox = (await page.getByRole('button', { name: 'Boulder hinzufügen', exact: true }).boundingBox())!;
    const uploadBox = (await page.getByRole('button', { name: '2 Boulder hochladen', exact: true }).boundingBox())!;
    expect(fabBox.y + fabBox.height).toBeLessThan(uploadBox.y);
    await expect(page.getByRole('button', { name: '2 Boulder hochladen', exact: true })).toBeInViewport();
    await page.screenshot({ path: `${output}/${loop}-queue-375.png`, fullPage: true });
    await page.evaluate(() => { window.setterQA.delay = 250; });
    await page.getByRole('button', { name: '2 Boulder hochladen', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Boulder hinzufügen', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Stapel eins bearbeiten', exact: true })).toBeDisabled();
    await expect(page.getByRole('progressbar', { name: 'Übertragene Boulder' })).toBeVisible();
    await expect(page.getByText('2 Boulder übertragen', { exact: true })).toBeVisible();
    expect(created).toBe(2);
    expect(await page.evaluate(() => window.setterQA.writes.map(w => w.kind))).toEqual(['upload-start', 'upload-wait', 'upload-start', 'upload-wait', 'upload-start', 'upload-wait', 'upload-start', 'upload-wait']);
    expect(await page.evaluate(() => window.setterQA.uploads)).toEqual(['thumbnail', 'video', 'thumbnail', 'video']);
  });
});
async function openPage(page: Page, name: string, extra = "") {
  await page.route("**/*", (r) =>
    new URL(r.request().url()).hostname === "127.0.0.1"
      ? r.continue()
      : r.abort(),
  );
  await page.route("**/*.supabase.co/**", (r) => r.abort());
  for (const hook of [
    "useAuth",
    "useColors",
    "useSectors",
    "useBoulders",
    "useBoulderCommunity",
    "useSectorSchedule",
    "useHallMaps",
  ]) {
    await page.route(`**/src/hooks/${hook}.ts*`, (r) =>
      r.fulfill({
        contentType: "application/javascript",
        body: "export * from '/test/fixtures/setter-hooks.ts';",
      }),
    );
  }
  await page.route("**/src/contexts/UploadContext.tsx*", (r) =>
    r.fulfill({
      contentType: "application/javascript",
      body: "export { useUpload } from '/test/fixtures/setter-hooks.ts';",
    }),
  );
  await page.goto(`/test/fixtures/setter-workspace.html?page=${name}${extra}`);
  await expect(page.locator("h1")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

test("editor: names survive color changes, real swatches, dirty close, validation and scroll", async ({
  page,
}) => {
  test.skip(baseline);
  await page.setViewportSize({ width: 375, height: 900 });
  await openPage(page, "create");
  await page
    .getByRole("button", { name: "Boulder hinzufügen", exact: true })
    .click();
  await page.getByLabel("Name", { exact: true }).fill("Meine eigene Route");
  await page.getByRole("button", { name: "Farbe Blau", exact: true }).click();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
    "Meine eigene Route",
  );
  expect(
    await page
      .getByRole("button", { name: "Farbe Blau", exact: true })
      .locator("span")
      .first()
      .evaluate((e) => getComputedStyle(e).backgroundColor),
  ).toBe("rgb(51, 109, 204)");
  await page
    .getByRole("button", { name: "Zum Stapel hinzufügen", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Pflichtfelder");
  await page
    .getByRole("button", { name: "Schwierigkeit 8", exact: true })
    .click();
  const number = page.getByRole("button", {
    name: "Schwierigkeit 8",
    exact: true,
  });
  expect(await number.evaluate((e) => getComputedStyle(e).placeItems)).toBe(
    "center",
  );
  await expect(
    page.getByRole("button", { name: "Zum Stapel hinzufügen", exact: true }),
  ).toBeInViewport();
  await page.getByRole("button", { name: "Abbrechen", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Abbrechen" })
    .click();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
    "Meine eigene Route",
  );
  await page.getByRole("button", { name: "Boulder-Editor schließen" }).click();
  await page.getByRole("button", { name: "Verwerfen", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await page.evaluate(() => window.setterQA.writes)).toEqual([]);
});

test("edit: all 125 boulders reachable; filter clears hidden selection and deletion is confirmed", async ({
  page,
}) => {
  test.skip(baseline);
  await openPage(page, "edit", "&many");
  await expect(page.locator("article")).toHaveCount(50);
  await page
    .getByRole("button", { name: "Weitere Boulder anzeigen (75)" })
    .click();
  await page
    .getByRole("button", { name: "Weitere Boulder anzeigen (25)" })
    .click();
  await expect(page.locator("article")).toHaveCount(125);
  await page
    .getByRole("checkbox", { name: "Grüne Welle auswählen", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Boulder suchen" })
    .fill("Kleine Kante");
  await expect(
    page.getByRole("button", { name: "Löschen", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("checkbox", { name: "Kleine Kante auswählen", exact: true })
    .click();
  await page.getByRole("button", { name: "Löschen", exact: true }).click();
  expect(await page.evaluate(() => window.setterQA.writes)).toEqual([]);
  await page.evaluate(() => {
    window.setterQA.fail = true;
  });
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Löschen", exact: true })
    .click();
  await expect(page.getByRole("alertdialog").getByRole("alert")).toContainText(
    "Testfehler",
  );
  await page.evaluate(() => {
    window.setterQA.fail = false;
  });
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Löschen", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(
    page.getByRole("checkbox", { name: "Kleine Kante auswählen", exact: true }),
  ).toHaveCount(0);
});

test("status: selection respects filter and batch confirmation scope", async ({
  page,
}) => {
  test.skip(baseline);
  await page.setViewportSize({ width: 375, height: 900 });
  await openPage(page, "status");
  await page.getByRole("button", { name: /^Hängt 8$/ }).click();
  await page.getByRole("button", { name: "Alle Ergebnisse wählen" }).click();
  await page.getByRole("button", { name: "Abschrauben", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toContainText(
    "8 ausgewählte Boulder",
  );
  expect(await page.evaluate(() => window.setterQA.writes)).toEqual([]);
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Abschrauben", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  expect(await page.evaluate(() => window.setterQA.writes)).toEqual([
    {
      kind: "update-status",
      payload: {
        ids: ["b-1", "b-2", "b-4", "b-5", "b-7", "b-8", "b-10", "b-11"],
        status: "abgeschraubt",
      },
    },
  ]);
});

test("schedule: valid date, physical IDs, pending lock, error retention and deletion", async ({
  page,
}) => {
  test.skip(baseline);
  await page.setViewportSize({ width: 375, height: 900 });
  await openPage(page, "schedule");
  await page.getByRole("button", { name: "Neuer Termin", exact: true }).click();
  await page
    .getByRole("button", { name: "Termin erstellen", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Teilbereiche");
  await page.getByRole("button", { name: "Datum wählen", exact: true }).click();
  const available = page.locator(".rdp-day:not([disabled])");
  // DayPicker uses our project classes; choose the next enabled day through its rendered label.
  const day = page.getByRole('grid').last().locator('button:not([disabled])').nth(1);
  await day.click();
  await page.getByRole("button", { name: "Bug A", exact: true }).click();
  await page.getByLabel("Uhrzeit", { exact: true }).fill("19:30");
  await page.evaluate(() => {
    window.setterQA.fail = true;
    window.setterQA.delay = 300;
  });
  await page
    .getByRole("button", { name: "Termin erstellen", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Terminplanung schließen" }),
  ).toBeDisabled();
  await expect(page.getByRole("alert")).toContainText("Testfehler");
  await expect(
    page.getByRole("button", { name: "Bug A", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => {
    window.setterQA.fail = false;
  });
  await page
    .getByRole("button", { name: "Termin erstellen", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const writes = await page.evaluate(() =>
    window.setterQA.writes.filter((w) => w.kind === "create-schedule"),
  );
  expect(writes).toHaveLength(2);
  expect((writes[1].payload as { sectorIds: string[] }).sectorIds).toHaveLength(
    2,
  );
  await page
    .getByRole("button", { name: "Termin Bug A löschen", exact: true })
    .last()
    .click();
  await expect(page.getByRole("alertdialog")).toContainText("keine Boulder");
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Löschen", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
});

for (const name of ["create", "edit", "status", "schedule"])
  test(`${name} distinguishes loading errors from empty results`, async ({
    page,
  }) => {
    test.skip(baseline);
    await openPage(page, name, "&error");
    await expect(page.getByRole("alert")).toContainText("geladen");
    await expect(
      page.getByRole("button", { name: "Erneut versuchen", exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => window.setterQA.writes)).toEqual([]);
  });
for (const width of [375, 768, 1280, 1920]) {
  for (const name of ["create", "edit", "status", "schedule"]) {
    test(`${name} responsive ${width}`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.setViewportSize({ width, height: 900 });
      await openPage(page, name);
      if (name === "edit" || name === "status")
        await expect(
          page.getByText("Grüne Welle", { exact: true }).first(),
        ).toBeVisible();
      if (name === "schedule")
        await expect(
          page
            .getByRole("button", { name: "Neuer Termin", exact: true })
            .first(),
        ).toBeVisible();
      await mkdir(output, { recursive: true });
      await page.screenshot({
        path: `${output}/${loop}-${name}-${width}.png`,
        animations: "disabled",
        fullPage: true,
      });
      if (name === "create" || name === "schedule") {
        await page
          .getByRole("button", {
            name: name === "create" ? "Boulder hinzufügen" : "Neuer Termin",
            exact: true,
          })
          .first()
          .click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.screenshot({
          path: `${output}/${loop}-${name}-dialog-${width}.png`,
          animations: "disabled",
        });
        if (!baseline) {
          const box = await page.getByRole("dialog").boundingBox();
          if (width < 768) {
            expect(box!.x).toBe(0);
            expect(box!.width).toBe(width);
            expect(Math.round(box!.y + box!.height)).toBe(900);
          }
          await expect(
            page.getByRole("button", { name: "Abbrechen", exact: true }),
          ).toBeInViewport();
        }
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(width);
      expect(errors).toEqual([]);
      expect(await page.evaluate(() => window.setterQA.writes)).toEqual([]);
    });
  }
}
