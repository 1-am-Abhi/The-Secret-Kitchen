/**
 * Two checks the UI can lie about:
 *  1. Do the tiffin billing-cycle / meal-slot selectors change real money, all
 *     the way into Postgres and the WhatsApp message?
 *  2. Does content saved in the admin CMS actually reach the storefront?
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100/api";

const env = Object.fromEntries(
  readFileSync(new URL("../../server/.env", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const step = (n, ok, d = "") => console.log(`  ${ok ? "✅" : "❌"} ${n.padEnd(34)} ${d}`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

/* ---------------------------------------------------------------- tiffin -- */
console.log("=== tiffin selectors change real pricing ===");
await page.goto(`${BASE}/tiffin`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);

/** Total on the middle (Regular) plan card, as rendered. */
const regularTotal = async () => {
  const txt = await page.locator("article").nth(1).innerText();
  const m = txt.match(/₹([\d,]+)\s*for\s*(\d+)\s*meals/);
  return m ? { total: m[1], meals: m[2] } : { total: "?", meals: "?" };
};

const pick = async (label) => {
  await page.getByRole("tab", { name: new RegExp(`^${label}`, "i") }).first().click();
  await page.waitForTimeout(900);
};

await pick("Monthly");
await pick("Lunch");
const monthlyLunch = await regularTotal();

await pick("Both");
const monthlyBoth = await regularTotal();

await pick("Weekly");
const weeklyBoth = await regularTotal();

await pick("Lunch");
const weeklyLunch = await regularTotal();

console.log(`     monthly+lunch ₹${monthlyLunch.total} (${monthlyLunch.meals} meals)`);
console.log(`     monthly+both  ₹${monthlyBoth.total} (${monthlyBoth.meals} meals)`);
console.log(`     weekly+both   ₹${weeklyBoth.total} (${weeklyBoth.meals} meals)`);
console.log(`     weekly+lunch  ₹${weeklyLunch.total} (${weeklyLunch.meals} meals)`);

step("Both doubles the meal count", Number(monthlyBoth.meals) === Number(monthlyLunch.meals) * 2);
step("cycle changes the price", monthlyLunch.total !== weeklyLunch.total);
step("all four combinations differ", new Set([
  monthlyLunch.total, monthlyBoth.total, weeklyBoth.total, weeklyLunch.total,
]).size === 4);

// Drive the real sign-up with a non-default combination.
await pick("Monthly");
await pick("Both");
await page.locator("article").nth(1).getByRole("button", { name: /subscribe/i }).click();
await page.waitForTimeout(1500);

const suffix = String(Date.now()).slice(-6);
await page.fill("#sub-name", "Tiffin Flow Test");
await page.fill("#sub-phone", `97${suffix.padStart(8, "6")}`.slice(0, 10));
await page.fill("#sub-address", "Flat 3, Subscription Court, Sector 62");
await page.fill("#sub-pincode", "201309");
await page.getByRole("button", { name: /create subscription/i }).click();
await page.waitForTimeout(9000);

const body = await page.locator("body").innerText();
const code = (body.match(/SUB-\d{6}-[A-Z0-9]{4}/) ?? [""])[0];
step("subscription created", Boolean(code), code);

const waHref = await page
  .locator('[role="dialog"] a[href^="https://wa.me/"]')
  .first()
  .getAttribute("href")
  .catch(() => "");
const waText = decodeURIComponent(waHref ?? "");
step("whatsapp states billing cycle", /Billing Cycle:\s*\nMonthly/.test(waText), "Monthly");
step("whatsapp states meals per day", /Meals Per Day:\s*\nLunch \+ Dinner/.test(waText), "Lunch + Dinner");
await page.screenshot({ path: "/tmp/ui-shots/flow/tiffin-confirm.png", fullPage: true });

/* ------------------------------------------------------------------- cms -- */
console.log("\n=== admin CMS reaches the storefront ===");
const login = await fetch(`${API}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }),
}).then((r) => r.json());

const marker = `Verified live at ${Date.now()}`;
const put = await fetch(`${API}/site-content/home.hero`, {
  method: "PUT",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${login.token}` },
  body: JSON.stringify({ value: { title: marker, subtitle: "CMS round trip" } }),
});
step("admin PUT accepted", put.ok, `HTTP ${put.status}`);

const readBack = await fetch(`${API}/site-content/home.hero`).then((r) => r.json());
step(
  "persisted in postgres",
  JSON.stringify(readBack).includes(marker),
  JSON.stringify(readBack?.data?.value ?? readBack).slice(0, 70),
);

// Clean up so the storefront is left exactly as found.
await fetch(`${API}/site-content/home.hero`, {
  method: "DELETE",
  headers: { Authorization: `Bearer ${login.token}` },
});
const after = await fetch(`${API}/site-content/home.hero`).then((r) => r.json());
step("cleanup removed the block", !JSON.stringify(after).includes(marker));

console.log(`\nSUBSCRIPTION_CODE=${code}`);
await browser.close();
