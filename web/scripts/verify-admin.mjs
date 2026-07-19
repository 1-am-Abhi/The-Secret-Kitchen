/**
 * Admin verification through a real browser: log in with the environment
 * credentials, then walk every admin page and report what actually rendered.
 *
 * Credentials are read from server/.env at runtime and never written anywhere.
 */
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
mkdirSync("/tmp/ui-shots/admin", { recursive: true });

const env = Object.fromEntries(
  readFileSync(new URL("../../server/.env", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const PAGES = [
  "/admin",
  "/admin/orders",
  "/admin/menu",
  "/admin/analytics",
  "/admin/customers",
  "/admin/content",
  "/admin/outlets",
  "/admin/gallery",
  "/admin/offers",
];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

const errors = [];
page.on("pageerror", (e) => errors.push(`EXCEPTION ${String(e).slice(0, 160)}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console ${m.text().slice(0, 160)}`);
});

console.log("=== login ===");
await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
console.log(`  /admin redirected to: ${page.url().replace(BASE, "")}`);

await page.fill('input[type="email"]', env.ADMIN_EMAIL);
await page.fill('input[type="password"]', env.ADMIN_PASSWORD);
await page.click('button[type="submit"]');
await page.waitForTimeout(3500);
console.log(`  after submit:         ${page.url().replace(BASE, "")}`);
const loggedIn = !page.url().includes("/admin/login");
console.log(`  authenticated:        ${loggedIn ? "YES ✅" : "NO ❌"}`);

if (loggedIn) {
  console.log("\n=== admin pages ===");
  for (const path of PAGES) {
    errors.length = 0;
    const started = Date.now();
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" }).catch(() => {});
    await page.waitForTimeout(5000);

    const m = await page.evaluate(() => {
      const vis = (el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && Number(s.opacity) > 0.05;
      };
      return {
        text: document.body.innerText.trim().length,
        skeletons: [...document.querySelectorAll(".shimmer,[class*='animate-pulse']")].filter(vis).length,
        boundary: document.body.innerText.includes("Something went wrong"),
        h1: document.querySelector("h1,h2")?.innerText?.slice(0, 48) ?? "(none)",
        rows: document.querySelectorAll("tbody tr").length,
      };
    });

    const bad = [];
    if (m.boundary) bad.push("ERROR BOUNDARY");
    if (m.skeletons) bad.push(`${m.skeletons} skeleton(s)`);
    if (m.text < 200) bad.push("blank");
    if (errors.length) bad.push(`${errors.length} error(s)`);

    console.log(
      `  ${path.padEnd(20)} ${Date.now() - started}ms  ${bad.length ? "❌ " + bad.join(", ") : "✅"}  "${m.h1}" rows=${m.rows}`,
    );
    for (const e of errors.slice(0, 2)) console.log(`      ${e}`);
    await page.screenshot({ path: `/tmp/ui-shots/admin${path.replace(/\//g, "-")}.png`, fullPage: true }).catch(() => {});
  }

  console.log("\n=== logout ===");
  // The control lives inside the account dropdown, which must be opened first.
  await page.getByRole("button", { name: /account|admin|kitchen admin/i }).first().click().catch(() => {});
  await page.waitForTimeout(800);
  const signOut = page.getByRole("button", { name: /sign out|log ?out/i }).first();
  if (await signOut.count()) {
    await signOut.click().catch(() => {});
    await page.waitForTimeout(2000);
    console.log(`  after sign out:  ${page.url().replace(BASE, "")}`);
    await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);
    console.log(
      `  /admin now:      ${page.url().replace(BASE, "")}  ${page.url().includes("login") ? "✅ protected" : "❌ still open"}`,
    );
  } else {
    console.log("  no sign-out control found in the account menu");
  }
}

await browser.close();
