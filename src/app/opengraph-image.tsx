import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const alt = "Попутка70 — карпулинг в Томске";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

export default async function OpengraphImage() {
  const fontDir = path.join(process.cwd(), "node_modules/@fontsource/unbounded/files");
  const [cyrillic, latin] = await Promise.all([
    readFile(path.join(fontDir, "unbounded-cyrillic-700-normal.woff")),
    readFile(path.join(fontDir, "unbounded-latin-700-normal.woff")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #1C4E66 0%, #14171A 65%, #4A3A24 100%)",
          color: "#FAFAF7",
          fontFamily: "Unbounded",
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: 6,
            textTransform: "uppercase",
            opacity: 0.7,
            marginBottom: 28,
          }}
        >
          Карпулинг в Томске
        </div>
        <div style={{ fontSize: 92, fontWeight: 700, lineHeight: 1.05 }}>Попутка70</div>
        <div style={{ fontSize: 34, marginTop: 32, opacity: 0.85, lineHeight: 1.4 }}>
          Сосед подвозит соседа — дешевле такси, быстрее автобуса
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Unbounded", data: cyrillic, weight: 700, style: "normal" },
        { name: "Unbounded", data: latin, weight: 700, style: "normal" },
      ],
    }
  );
}
