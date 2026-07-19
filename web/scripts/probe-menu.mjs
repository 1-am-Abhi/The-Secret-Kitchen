/** Diagnostic: why is the menu grid blank? Measures card opacity over time. */
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("http://localhost:3000/menu", { waitUntil: "domcontentloaded" });

const sample = async (label) => {
  const r = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("article")];
    const opacities = cards.map((c) => {
      // The animated wrapper is the StaggerItem around each card.
      const wrap = c.closest("[data-reveal]") ?? c;
      return Number(getComputedStyle(wrap).opacity);
    });
    const visible = opacities.filter((o) => o > 0.9).length;
    const hidden = opacities.filter((o) => o < 0.1).length;
    return { total: cards.length, visible, hidden };
  });
  console.log(
    `  ${label.padEnd(22)} cards=${r.total}  fullyVisible=${r.visible}  invisible(opacity<0.1)=${r.hidden}`,
  );
  return r;
};

await sample("at DOMContentLoaded");
await page.waitForTimeout(1000);
await sample("+1s");
await page.waitForTimeout(2000);
await sample("+3s (no scroll)");
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(3000);
await sample("+3s after scrolling");

await browser.close();
