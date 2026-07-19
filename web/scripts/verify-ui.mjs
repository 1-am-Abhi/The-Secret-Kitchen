/**
 * Browser-truth verification.
 *
 * HTTP 200 proves a server responded; it proves nothing about what a customer
 * sees. This drives a real Chromium, waits for the network to settle, then
 * reports what is actually on screen — console errors, page exceptions, failed
 * image requests, visible dish cards, leftover skeletons and blank regions.
 *
 * Usage: node scripts/verify-ui.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const SHOTS = "/tmp/ui-shots";
mkdirSync(SHOTS, { recursive: true });

const PAGES = [
  { path: "/", name: "home" },
  { path: "/menu", name: "menu" },
  { path: "/tiffin", name: "tiffin" },
  { path: "/gallery", name: "gallery" },
  { path: "/offers", name: "offers" },
  { path: "/about", name: "about" },
  { path: "/admin", name: "admin" },
  { path: "/admin/login", name: "admin-login" },
];

const browser = await chromium.launch();
let failures = 0;

for (const { path, name } of PAGES) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 200));
  });
  page.on("pageerror", (err) => pageErrors.push(String(err).slice(0, 200)));
  page.on("requestfailed", (req) =>
    failedRequests.push(`${req.failure()?.errorText ?? "failed"} ${req.url().slice(0, 110)}`),
  );
  page.on("response", (res) => {
    if (res.status() >= 400) failedRequests.push(`HTTP ${res.status()} ${res.url().slice(0, 110)}`);
  });

  const started = Date.now();
  let status = "?";
  try {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 45000 });
    status = res?.status() ?? "?";
  } catch (error) {
    pageErrors.push(`navigation: ${String(error).slice(0, 160)}`);
  }
  const loadMs = Date.now() - started;

  // Give lazy/in-view content a chance, then scroll to trigger anything below.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});

  const metrics = await page
    .evaluate(() => {
      const visible = (el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
      };
      const imgs = [...document.images];
      return {
        articles: [...document.querySelectorAll("article")].filter(visible).length,
        images: imgs.length,
        brokenImages: imgs.filter((i) => i.complete && i.naturalWidth === 0).length,
        loadingImages: imgs.filter((i) => !i.complete).length,
        skeletons: [...document.querySelectorAll(".shimmer,[class*='animate-pulse']")].filter(
          visible,
        ).length,
        errorBoundary: document.body.innerText.includes("Something went wrong"),
        textLength: document.body.innerText.trim().length,
        h1: document.querySelector("h1")?.innerText?.slice(0, 60) ?? "(none)",
      };
    })
    .catch(() => null);

  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }).catch(() => {});

  const problems = [];
  if (metrics?.errorBoundary) problems.push("ERROR BOUNDARY");
  if (pageErrors.length) problems.push(`${pageErrors.length} page exception(s)`);
  if (metrics && metrics.brokenImages > 0) problems.push(`${metrics.brokenImages} broken image(s)`);
  if (metrics && metrics.skeletons > 0) problems.push(`${metrics.skeletons} skeleton(s) left`);
  if (metrics && metrics.textLength < 400) problems.push("page looks blank");
  if (problems.length) failures += 1;

  console.log(
    `\n${path}  [${status}]  ${loadMs}ms  ${problems.length ? "❌ " + problems.join(", ") : "✅"}`,
  );
  console.log(
    `   h1="${metrics?.h1}"  articles=${metrics?.articles}  imgs=${metrics?.images}` +
      ` broken=${metrics?.brokenImages} pending=${metrics?.loadingImages} skeletons=${metrics?.skeletons}`,
  );
  for (const e of pageErrors.slice(0, 3)) console.log(`   ⨯ ${e}`);
  for (const e of consoleErrors.slice(0, 3)) console.log(`   console: ${e}`);
  for (const r of [...new Set(failedRequests)].slice(0, 5)) console.log(`   net: ${r}`);

  await context.close();
}

await browser.close();
console.log(`\n${failures === 0 ? "ALL PAGES OK" : `${failures} page(s) with problems`}`);
process.exit(failures === 0 ? 0 : 1);
