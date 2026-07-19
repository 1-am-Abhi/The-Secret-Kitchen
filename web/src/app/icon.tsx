import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/**
 * App icon — the same cloche mark as the wordmark, rendered at 512px so it
 * serves as favicon, PWA icon and Apple touch icon from one source.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #FF8F3D 0%, #FF6B00 100%)",
          borderRadius: 112,
        }}
      >
        <svg width="330" height="330" viewBox="0 0 40 40" fill="none">
          <path
            d="M10 25.5c0-5.523 4.477-10 10-10s10 4.477 10 10"
            stroke="white"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <circle cx="20" cy="13.2" r="2" fill="white" />
          <path d="M7.5 26.8h25" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      </div>
    ),
    size,
  );
}
