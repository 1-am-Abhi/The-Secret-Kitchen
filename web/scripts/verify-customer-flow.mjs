/**
 * End-to-end customer journey, driven through the browser UI.
 *
 * Every step is a real click on a real control — search, filter, add to cart,
 * quantity, remove, checkout, order. The order number it produces is printed so
 * the caller can confirm the row in PostgreSQL independently.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
mkdirSync("/tmp/ui-shots/flow", { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

const errors = [];
page.on("pageerror", (e) => errors.push(`EXCEPTION ${String(e).slice(0, 140)}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console ${m.text().slice(0, 140)}`);
});

const step = (name, ok, detail = "") =>
  console.log(`  ${ok ? "✅" : "❌"} ${name.padEnd(30)} ${detail}`);

const cards = () => page.locator("article").count();

console.log("=== browse & filter ===");
await page.goto(`${BASE}/menu`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
const all = await cards();
step("menu lists dishes", all > 40, `${all} cards`);

await page.getByPlaceholder(/search/i).fill("paneer");
await page.waitForTimeout(900);
const searched = await cards();
step("search narrows results", searched > 0 && searched < all, `"paneer" → ${searched}`);

await page.getByPlaceholder(/search/i).fill("");
await page.waitForTimeout(700);
await page.getByRole("button", { name: /^Desserts/ }).first().click();
await page.waitForTimeout(900);
const filtered = await cards();
step("category filter works", filtered > 0 && filtered < all, `Desserts → ${filtered}`);

await page.getByRole("button", { name: /^All dishes/ }).first().click();
await page.waitForTimeout(900);

console.log("\n=== cart ===");
await page.locator("article").first().getByRole("button", { name: /add .* to cart/i }).click();
await page.waitForTimeout(1200);
await page.locator("article").nth(1).getByRole("button", { name: /add .* to cart/i }).click();
await page.waitForTimeout(1500);

await page.goto(`${BASE}/cart`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
const lines = await page.locator("main li").filter({ has: page.locator("img") }).count();
step("cart shows added items", lines >= 2, `${lines} lines`);

const totalBefore = await page.locator("text=/To pay/i").locator("..").innerText().catch(() => "");
await page.getByRole("button", { name: /increase/i }).first().click();
await page.waitForTimeout(1500);
const totalAfter = await page.locator("text=/To pay/i").locator("..").innerText().catch(() => "");
step("quantity changes total", totalBefore !== totalAfter, `${totalBefore.replace(/\s+/g, " ")} → ${totalAfter.replace(/\s+/g, " ")}`);

await page.getByRole("button", { name: /^Remove /i }).first().click();
await page.waitForTimeout(1500);
const afterRemove = await page.locator("main li").filter({ has: page.locator("img") }).count();
step("remove item works", afterRemove === lines - 1, `${lines} → ${afterRemove}`);
await page.screenshot({ path: "/tmp/ui-shots/flow/cart.png", fullPage: true });

console.log("\n=== checkout ===");
await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);

const stamp = Date.now().toString().slice(-6);
await page.fill("#name", "Browser Flow Test");
await page.fill("#phone", `98${stamp.padStart(8, "7")}`.slice(0, 10));
await page.fill("#addressLine1", "Flat 7, Verification Heights, Sector 62");
await page.fill("#pincode", "201309");
await page.fill("#kitchenNote", "placed by the automated browser audit");
await page.screenshot({ path: "/tmp/ui-shots/flow/checkout.png", fullPage: true });

await page.getByRole("button", { name: /place order/i }).click();
await page.waitForTimeout(9000);

const onConfirm = page.url().includes("/checkout/confirm");
step("order submitted", onConfirm, page.url().replace(BASE, ""));

let orderNumber = "";
if (onConfirm) {
  orderNumber = (await page.locator("text=/TSK-\\d{4}-\\d{5}/").first().innerText().catch(() => "")).trim();
  step("sequential order id shown", /^TSK-\d{4}-\d{5}$/.test(orderNumber), orderNumber);

  const wa = await page.locator('a[href^="https://wa.me/"]').first().getAttribute("href").catch(() => "");
  const text = decodeURIComponent(wa ?? "");
  step("whatsapp link built", (wa ?? "").startsWith("https://wa.me/"), `${wa?.slice(0, 34)}…`);
  step("whatsapp names the order", text.includes(orderNumber), orderNumber);
  await page.screenshot({ path: "/tmp/ui-shots/flow/confirm.png", fullPage: true });

  console.log("\n=== tracking ===");
  await page.goto(`${BASE}/track/${orderNumber}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  const body = await page.locator("body").innerText();
  step("tracking finds the order", body.includes(orderNumber), orderNumber);
  step("tracking shows a status", /await|confirm|pending/i.test(body), "awaiting confirmation");
  await page.screenshot({ path: "/tmp/ui-shots/flow/tracking.png", fullPage: true });
}

console.log("\n=== console health ===");
step("no console errors / exceptions", errors.length === 0, errors.slice(0, 2).join(" | "));

console.log(`\nORDER_NUMBER=${orderNumber}`);
await browser.close();
