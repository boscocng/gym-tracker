import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FF7A1A",
          color: "#0D0D0C",
          fontSize: 96,
          fontWeight: 700,
        }}
      >
        S
      </div>
    ),
    size,
  );
}
