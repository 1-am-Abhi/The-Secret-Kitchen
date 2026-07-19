/** Is React hydrating, and is framer-motion running? */
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 300)));
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") errors.push(`[${m.type()}] ${m.text().slice(0, 300)}`);
});

await page.goto("http://localhost:3000/menu", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);

console.log("=== console/page errors ===");
console.log(errors.length ? errors.slice(0, 8).join("\n") : "  (none)");

console.log("\n=== is React interactive? click a category chip ===");
const before = await page.evaluate(() => document.querySelectorAll("article").length);
try {
  await page.getByRole("button", { name: /Desserts/i }).first().click({ timeout: 5000 });
  await page.waitForTimeout(1200);
  const after = await page.evaluate(() => document.querySelectorAll("article").length);
  console.log(`  cards before=${before} after clicking Desserts=${after}  -> ${after !== before ? "REACT IS INTERACTIVE ✅" : "state did not change ❌"}`);
} catch (e) {
  console.log("  could not click chip:", String(e).slice(0, 120));
}

console.log("\n=== motion state ===");
const motion = await page.evaluate(() => {
  const el = document.querySelector("[data-reveal]");
  if (!el) return { found: false };
  const cs = getComputedStyle(el);
  return {
    found: true,
    opacity: cs.opacity,
    transform: cs.transform,
    inlineStyle: el.getAttribute("style")?.slice(0, 160) ?? "(no inline style)",
  };
});
console.log(" ", JSON.stringify(motion, null, 2).replace(/\n/g, "\n  "));

console.log("\n=== reduced motion reported by the browser? ===");
console.log("  matchMedia(prefers-reduced-motion: reduce) =", await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches));

await browser.close();
