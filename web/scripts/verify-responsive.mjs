/**
 * Responsive audit: horizontal overflow, touch-target size and nav reachability
 * at mobile, tablet and desktop widths.
 *
 * Horizontal overflow is the failure that actually ruins a phone layout, and it
 * is invisible in a desktop screenshot — so it is measured rather than eyeballed.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
mkdirSync("/tmp/ui-shots/responsive", { recursive: true });

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 900 },
];
const PAGES = ["/", "/menu", "/tiffin", "/gallery", "/offers", "/about"];

const browser = await chromium.launch();
let problems = 0;

for (const vp of VIEWPORTS) {
  console.log(`\n=== ${vp.name} (${vp.width}px) ===`);
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.width < 768,
    hasTouch: vp.width < 768,
  });

  for (const path of PAGES) {
    const page = await context.newPage();
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(600);

    const audit = await page.evaluate(() => {
      const doc = document.documentElement;
      /*
       * Measure whether the page can ACTUALLY be scrolled sideways, not
       * scrollWidth. With `overflow-x: clip` the content box still reports a
       * wider scrollWidth while being unscrollable, so the raw number is a
       * false positive — what matters is whether a user can drag the page off
       * screen.
       */
      const beforeX = window.scrollX;
      window.scrollTo(1000, window.scrollY);
      const overflowPx = Math.max(0, Math.round(window.scrollX));
      window.scrollTo(beforeX, window.scrollY);

      // Elements sticking out past the right edge are what cause the sideways
      // scroll; report the worst offender so it is actionable.
      let worst = null;
      if (overflowPx > 0) {
        for (const el of document.querySelectorAll("*")) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.right > doc.clientWidth + 1) {
            const over = Math.round(r.right - doc.clientWidth);
            if (!worst || over > worst.over) {
              worst = {
                over,
                tag: el.tagName.toLowerCase(),
                cls: (el.className?.toString?.() ?? "").slice(0, 60),
              };
            }
          }
        }
      }

      /*
       * Touch targets below 32px are hard to hit on a phone — but inline links
       * inside a paragraph are exempt from that guidance and were producing
       * ~21 false positives per page. Only standalone controls are counted:
       * buttons, and links that are not sitting inside flowing text.
       */
      const small = [...document.querySelectorAll("a,button,[role='button']")].filter((el) => {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (r.width === 0 || style.visibility === "hidden" || style.display === "none") return false;
        if (style.display === "inline") return false;
        const parentTag = el.parentElement?.tagName ?? "";
        if (["P", "LI", "SPAN", "DD", "DT"].includes(parentTag)) return false;
        // Skip links are 1x1 until focused; that is the pattern, not a defect.
        if (el.classList.contains("sr-only") || el.textContent?.startsWith("Skip to")) return false;
        return r.height < 32 || r.width < 32;
      }).length;

      return { overflowPx, worst, small, text: document.body.innerText.trim().length };
    });

    const flags = [];
    if (audit.overflowPx > 0) {
      flags.push(
        `overflow ${audit.overflowPx}px (${audit.worst?.tag}.${audit.worst?.cls ?? ""})`,
      );
    }
    if (audit.small > 0) flags.push(`${audit.small} control(s) under 32px`);
    if (audit.text < 400) flags.push("looks blank");
    if (flags.length) problems += 1;

    console.log(`  ${path.padEnd(10)} ${flags.length ? "❌ " + flags.join(" · ") : "✅"}`);

    if (path === "/" || path === "/menu") {
      await page
        .screenshot({ path: `/tmp/ui-shots/responsive/${vp.name}${path.replace("/", "-") || "-home"}.png` })
        .catch(() => {});
    }
    await page.close();
  }
  await context.close();
}

await browser.close();
console.log(`\n${problems === 0 ? "RESPONSIVE: all clean" : `${problems} viewport/page combination(s) with issues`}`);
