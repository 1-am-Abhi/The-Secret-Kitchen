/** Real Web Vitals + resource breakdown, measured in Chromium. */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const browser = await chromium.launch();

for (const path of ["/", "/menu", "/gallery"]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`${BASE}${path}`, { waitUntil: "load" });

  const lcp = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let value = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) value = entry.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
        setTimeout(() => resolve(Math.round(value)), 2500);
      }),
  );

  const stats = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const res = performance.getEntriesByType("resource");
    const group = (filter) => {
      const list = res.filter(filter);
      return {
        n: list.length,
        kb: Math.round(list.reduce((s, r) => s + (r.transferSize || 0), 0) / 1024),
        slowestMs: Math.round(Math.max(0, ...list.map((r) => r.duration))),
      };
    };
    return {
      ttfb: Math.round(nav.responseStart),
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
      load: Math.round(nav.loadEventEnd),
      images: group((r) => r.initiatorType === "img"),
      scripts: group((r) => r.initiatorType === "script"),
      css: group((r) => r.initiatorType === "link" || r.name.endsWith(".css")),
    };
  });

  console.log(`\n${path}`);
  console.log(`  TTFB ${stats.ttfb}ms · DCL ${stats.domContentLoaded}ms · load ${stats.load}ms · LCP ${lcp}ms`);
  console.log(
    `  images  ${String(stats.images.n).padStart(3)} files ${String(stats.images.kb).padStart(5)} KB  slowest ${stats.images.slowestMs}ms`,
  );
  console.log(
    `  scripts ${String(stats.scripts.n).padStart(3)} files ${String(stats.scripts.kb).padStart(5)} KB  slowest ${stats.scripts.slowestMs}ms`,
  );
  await page.close();
}

await browser.close();
