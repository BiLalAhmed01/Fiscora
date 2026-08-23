import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Fiscora -- your entire financial team, in one AI agent.";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
          color: "#ffffff",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="#ffffff">
            <g transform="rotate(-30 12 12)">
              <circle cx="7.3" cy="3.2" r="1.45" />
              <rect x="5.5" y="4.7" width="3.6" height="14.6" rx="1.8" />
              <rect x="14.9" y="4.7" width="3.6" height="14.6" rx="1.8" />
              <circle cx="16.7" cy="20.8" r="1.45" />
            </g>
          </svg>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 600, letterSpacing: -1 }}>
            <span>Fiscora</span>
            <span style={{ color: "#9a9a9a", fontWeight: 400 }}>.ai</span>
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 500, letterSpacing: -1, textAlign: "center" }}>
          Your entire financial team,
        </div>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 500, letterSpacing: -1, marginBottom: 20 }}>
          in one AI agent.
        </div>
        <div style={{ display: "flex", fontSize: 22, color: "#9a9a9a" }}>
          Markets · Investing · Budgeting · Savings · Debt payoff
        </div>
      </div>
    ),
    { ...size }
  );
}
