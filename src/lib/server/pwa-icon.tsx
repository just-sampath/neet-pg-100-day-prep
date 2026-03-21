import { ImageResponse } from "next/og";

function PwaIconArtwork({ maskable = false }: { maskable?: boolean }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: maskable
          ? "radial-gradient(circle at top, rgba(241, 185, 104, 0.22), transparent 36%), linear-gradient(180deg, #0f172a, #0a1120)"
          : "linear-gradient(135deg, #0f172a, #1d2c46)",
      }}
    >
      <svg viewBox="0 0 512 512" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="pwa-accent" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f1b968" />
            <stop offset="100%" stopColor="#f29b51" />
          </linearGradient>
        </defs>
        <rect
          x={maskable ? 46 : 0}
          y={maskable ? 46 : 0}
          width={maskable ? 420 : 512}
          height={maskable ? 420 : 512}
          rx={maskable ? 108 : 128}
          fill={maskable ? "rgba(8, 11, 18, 0.88)" : "transparent"}
        />
        <path
          d="M156 135h95c84 0 132 44 132 112 0 38-18 70-50 89 22 15 34 38 34 68 0 64-44 108-121 108H156V135Z"
          fill="#f7f0e2"
        />
        <path
          d="M226 197v102h30c36 0 57-20 57-52 0-31-21-50-57-50h-30Zm0 162v91h18c37 0 59-16 59-45 0-30-22-46-62-46h-15Z"
          fill="url(#pwa-accent)"
        />
      </svg>
    </div>
  );
}

export function createPwaIconResponse(options: { size: number; maskable?: boolean }) {
  return new ImageResponse(<PwaIconArtwork maskable={options.maskable} />, {
    width: options.size,
    height: options.size,
  });
}
