import { memo, useId } from "react";

const HISTORY = ["1.58x", "20.92x", "1.10x", "0.89x", "1.14x", "10.38x", "3.08x", "1.63x", "1.17x"];
const HISTORY_COLORS = ["#5ec8ff", "#e85cff", "#7d8cff", "#c084fc", "#60a5fa", "#f472b6", "#a78bfa", "#38bdf8", "#818cf8"];

function point(t: number) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0));
  const x = 36 + clamped * 300;
  const y = 286 - Math.pow(clamped, 1.35) * 214;
  return { x, y };
}

function curvePath(t: number) {
  const steps = 24;
  let d = "";
  for (let i = 0; i <= steps; i += 1) {
    const p = point((t * i) / steps);
    d += `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }
  return d;
}

function fillPath(t: number) {
  const end = point(t);
  return `${curvePath(t)} L${end.x.toFixed(1)} 292 L36 292 Z`;
}

export const AviatorBoard = memo(function AviatorBoard() {
  const rawId = useId().replace(/:/g, "");
  const rayId = `ray-${rawId}`;
  const fillId = `fill-${rawId}`;
  const progress = 0.7;
  const multiplier = 1 + progress * 4;
  const position = point(progress);

  return (
    <svg
      viewBox="0 0 360 470"
      width="360"
      height="470"
      className="block h-auto w-full"
      style={{ aspectRatio: "360 / 470", backgroundColor: "#12081f" }}
      role="img"
      aria-label="Live Aviator odds"
    >
      <defs>
        <linearGradient id={rayId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b1d73" />
          <stop offset="55%" stopColor="#1a0d33" />
          <stop offset="100%" stopColor="#0b0614" />
        </linearGradient>
        <linearGradient id={fillId} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#ff2a2a" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ff5a6a" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <rect width="360" height="300" fill="#1a0d33" />
      <rect width="360" height="300" fill={`url(#${rayId})`} />
      {Array.from({ length: 14 }).map((_, i) => (
        <line
          key={i}
          x1="0"
          y1={20 + i * 28}
          x2="360"
          y2={-40 + i * 18}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="18"
        />
      ))}
      <g>
        {HISTORY.map((item, i) => (
          <text
            key={item}
            x={12 + i * 38}
            y="22"
            fill={HISTORY_COLORS[i]}
            fontSize="11"
            fontWeight="700"
            fontFamily="Inter, sans-serif"
          >
            {item}
          </text>
        ))}
      </g>
      <path d={fillPath(progress)} fill={`url(#${fillId})`} />
      <path
        d={curvePath(progress)}
        fill="none"
        stroke="#ff4d6a"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <text
        x="180"
        y="168"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="54"
        fontWeight="800"
        fontFamily="Inter, sans-serif"
      >
        {multiplier.toFixed(2)}x
      </text>
      <g transform={`translate(${position.x} ${position.y})`}>
        <g transform="translate(-30 -16)">
          <path d="M6 16 L16 8 L14 16 L16 24 Z" fill="#b00000" />
          <path d="M14 14 C28 10 46 10 58 15 C46 20 28 20 14 16 Z" fill="#ff1f1f" />
          <path d="M24 14 L46 2 L50 7 L30 16 Z" fill="#e10600" />
          <path d="M24 16 L44 26 L40 29 L22 18 Z" fill="#9d0000" />
          <path d="M20 13 L48 13" stroke="#ffd6d6" strokeWidth="1.4" />
          <ellipse cx="40" cy="13" rx="6" ry="3.2" fill="#1c1c1c" />
          <ellipse cx="40" cy="12.2" rx="3" ry="1.4" fill="#7dd3ff" />
          <g>
            <ellipse cx="58" cy="15" rx="1.6" ry="8" fill="#ffe4e4" opacity="0.85" />
          </g>
          <circle cx="58" cy="15" r="2.2" fill="#ff2a2a" />
        </g>
      </g>
      <rect y="300" width="360" height="170" fill="#070707" />
      <g fill="#9aa3b8" fontSize="11" fontFamily="Inter, sans-serif" fontWeight="700">
        <text x="150" y="326" textAnchor="middle">
          Bet
        </text>
        <text x="210" y="326" textAnchor="middle">
          Auto
        </text>
      </g>
      <g>
        <rect x="16" y="342" width="328" height="108" rx="16" fill="#121212" stroke="rgba(255,255,255,0.06)" />
        <g>
          <rect x="214" y="358" width="114" height="56" rx="16" fill="#3dff6a" />
          <text
            x="271"
            y="378"
            textAnchor="middle"
            fill="#083016"
            fontSize="13"
            fontWeight="800"
            fontFamily="Inter, sans-serif"
          >
            {(100 * multiplier).toFixed(2)}
          </text>
          <text x="271" y="396" textAnchor="middle" fill="#083016" fontSize="11" fontWeight="800" fontFamily="Inter, sans-serif">
            BET
          </text>
        </g>
        <text x="90" y="390" textAnchor="middle" fill="#ffffff" fontSize="20" fontWeight="800" fontFamily="Inter, sans-serif">
          100.00
        </text>
      </g>
    </svg>
  );
});
