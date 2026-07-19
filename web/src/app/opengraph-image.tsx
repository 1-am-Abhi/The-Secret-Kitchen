import { ImageResponse } from "next/og";

import { siteConfig } from "@/config/site";

export const runtime = "edge";
export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Social share card, generated at build time.
 *
 * Rendered rather than hand-designed so it always reflects the live tagline and
 * stats — and so there is no 1200×630 PNG to keep in sync by hand. Uses system
 * fonts only: bundling a font file here would slow every OG render.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #1F2937 0%, #111827 55%, #5C2400 100%)",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        {/* Warm brand glow */}
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -140,
            width: 620,
            height: 620,
            borderRadius: 9999,
            background: "rgba(255, 107, 0, 0.30)",
            filter: "blur(120px)",
            display: "flex",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              background: "linear-gradient(135deg, #FF8F3D, #FF6B00)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 38,
            }}
          >
            🍲
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 34, fontWeight: 700, color: "#fff", letterSpacing: -1 }}>
              The Secret Kitchen
            </div>
            <div style={{ fontSize: 18, color: "#FFB070", letterSpacing: 2 }}>
              PURE VEG CLOUD KITCHEN
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 82,
              fontWeight: 800,
              color: "#fff",
              lineHeight: 1.05,
              letterSpacing: -3,
              maxWidth: 940,
              display: "flex",
            }}
          >
            Homemade Happiness, Delivered Fresh.
          </div>
          <div style={{ fontSize: 28, color: "#9CA3AF", maxWidth: 860, display: "flex" }}>
            Freshly cooked vegetarian meals and monthly tiffins — from ₹89 a meal.
          </div>
        </div>

        <div style={{ display: "flex", gap: 44, alignItems: "center" }}>
          {[
            { value: siteConfig.stats.mealsServed, label: "Meals served" },
            { value: siteConfig.stats.tiffinSubscribers, label: "Subscribers" },
            { value: `${siteConfig.stats.rating}★`, label: "Average rating" },
            { value: "45 min", label: "Delivery" },
          ].map((stat) => (
            <div key={stat.label} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: "#FF8F3D" }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 18, color: "#9CA3AF" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
