import { useEffect, useId, useRef } from "react";

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

export function AviatorBoard() {
  const rawId = useId().replace(/:/g, "");
  const rayId = `ray-${rawId}`;
  const fillId = `fill-${rawId}`;
  const oddsRef = useRef<SVGTextElement>(null);
  const planeRef = useRef<SVGGElement>(null);
  const propRef = useRef<SVGGElement>(null);
  const strokeRef = useRef<SVGPathElement>(null);
  const fillRef = useRef<SVGPathElement>(null);
  const cashRef = useRef<SVGTextElement>(null);
  const betRef = useRef<SVGRectElement>(null);
  const labelRef = useRef<SVGTextElement>(null);
  const betGroupRef = useRef<SVGGElement>(null);
  const coinRef = useRef<SVGGElement>(null);
  const flyingRef = useRef(false);
  const multRef = useRef(1);
  const tRef = useRef(0);
  const cashingRef = useRef(false);
  const cashUntilRef = useRef(0);

  function cashOut() {
    if (!flyingRef.current || cashingRef.current) return;
    cashingRef.current = true;
    cashUntilRef.current = performance.now() + 2000;
  }

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const paint = (mult: number, t: number, cashing = false) => {
      const here = point(t);
      const ahead = point(t + 0.04);
      const rise = ahead.y - here.y;
      const run = ahead.x - here.x;
      const angle = Number.isFinite(rise) && Number.isFinite(run) ? (Math.atan2(rise, run) * 180) / Math.PI : 0;
      const tilt = angle * 0.4;
      const bob = reduce ? 0 : Math.sin(performance.now() / 4200) * 8;
      const flying = t < 1 && !cashing;
      flyingRef.current = flying;
      if (!cashing) {
        multRef.current = mult;
        tRef.current = t;
      }
      if (oddsRef.current) oddsRef.current.textContent = `${mult.toFixed(2)}x`;
      if (cashRef.current) cashRef.current.textContent = (100 * mult).toFixed(2);
      if (betRef.current) betRef.current.setAttribute("fill", flying || cashing ? "#f0c14d" : "#3dff6a");
      if (labelRef.current) {
        labelRef.current.textContent = cashing ? "CASHED" : flying ? "CASH OUT" : "BET";
        labelRef.current.setAttribute("fill", flying || cashing ? "#000000" : "#083016");
      }
      if (cashRef.current) cashRef.current.setAttribute("fill", flying || cashing ? "#3a2a00" : "#083016");
      if (betGroupRef.current) betGroupRef.current.removeAttribute("transform");
      if (coinRef.current && !cashing) coinRef.current.setAttribute("opacity", "0");
      if (strokeRef.current) strokeRef.current.setAttribute("d", curvePath(t));
      if (fillRef.current) fillRef.current.setAttribute("d", fillPath(t));
      if (planeRef.current) {
        planeRef.current.setAttribute(
          "transform",
          `translate(${here.x.toFixed(1)} ${(here.y + bob).toFixed(1)}) rotate(${tilt.toFixed(1)})`,
        );
      }
      if (propRef.current) {
        const spin = ((performance.now() / 18) % 360).toFixed(1);
        propRef.current.setAttribute("transform", `rotate(${spin} 58 15)`);
      }
    };

    if (reduce) {
      paint(5, 1);
      return;
    }

    let flight = 0;
    const climbMs = 18000;
    const holdMs = 1400;
    let last = performance.now();
    let raf = 0;
    let coinX = 180;
    let coinY = 250;
    let coinVX = 3.4;
    let coinVY = -4.2;
    let coinLive = false;
    const coinR = 18;

    const step = (now: number) => {
      const dt = Math.max(0, Math.min(48, now - last));
      last = now;
      if (cashingRef.current) {
        if (now >= cashUntilRef.current) {
          cashingRef.current = false;
          coinLive = false;
          flight = 0;
          if (coinRef.current) coinRef.current.setAttribute("opacity", "0");
        } else {
          if (!coinLive) {
            coinLive = true;
            coinX = 180;
            coinY = 250;
            coinVX = 3.4;
            coinVY = -4.2;
          }
          const scale = dt / 16;
          coinX += coinVX * scale;
          coinY += coinVY * scale;
          if (coinX <= coinR) {
            coinX = coinR;
            coinVX = Math.abs(coinVX);
          } else if (coinX >= 360 - coinR) {
            coinX = 360 - coinR;
            coinVX = -Math.abs(coinVX);
          }
          if (coinY <= coinR + 6) {
            coinY = coinR + 6;
            coinVY = Math.abs(coinVY);
          } else if (coinY >= 292 - coinR) {
            coinY = 292 - coinR;
            coinVY = -Math.abs(coinVY);
          }
          if (coinRef.current) {
            const spin = (coinX * 4).toFixed(1);
            coinRef.current.setAttribute("opacity", "1");
            coinRef.current.setAttribute("transform", `translate(${coinX.toFixed(1)} ${coinY.toFixed(1)}) rotate(${spin})`);
          }
          paint(multRef.current, tRef.current, true);
          raf = requestAnimationFrame(step);
          return;
        }
      }
      flight += dt;
      if (flight >= climbMs + holdMs) flight = 0;
      const t = Math.min(1, flight / climbMs);
      const mult = 1 + t * 4;
      paint(mult, t);
      raf = requestAnimationFrame(step);
    };

    paint(1, 0);
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const start = point(0);

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
      <path ref={fillRef} d={fillPath(0.35)} fill={`url(#${fillId})`} />
      <path
        ref={strokeRef}
        d={curvePath(0.35)}
        fill="none"
        stroke="#ff4d6a"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <text
        ref={oddsRef}
        x="180"
        y="168"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="54"
        fontWeight="800"
        fontFamily="Inter, sans-serif"
      >
        1.00x
      </text>
      <g ref={planeRef} transform={`translate(${start.x} ${start.y})`}>
        <g transform="translate(-30 -16)">
          <path d="M6 16 L16 8 L14 16 L16 24 Z" fill="#b00000" />
          <path d="M14 14 C28 10 46 10 58 15 C46 20 28 20 14 16 Z" fill="#ff1f1f" />
          <path d="M24 14 L46 2 L50 7 L30 16 Z" fill="#e10600" />
          <path d="M24 16 L44 26 L40 29 L22 18 Z" fill="#9d0000" />
          <path d="M20 13 L48 13" stroke="#ffd6d6" strokeWidth="1.4" />
          <ellipse cx="40" cy="13" rx="6" ry="3.2" fill="#1c1c1c" />
          <ellipse cx="40" cy="12.2" rx="3" ry="1.4" fill="#7dd3ff" />
          <g ref={propRef}>
            <ellipse cx="58" cy="15" rx="1.6" ry="8" fill="#ffe4e4" opacity="0.85" />
          </g>
          <circle cx="58" cy="15" r="2.2" fill="#ff2a2a" />
        </g>
      </g>
      <g ref={coinRef} opacity="0">
        <circle r="18" fill="#f0c14d" stroke="#8a6200" strokeWidth="2" />
        <circle r="12" fill="none" stroke="#fff4c2" strokeWidth="1.6" />
        <text y="5" textAnchor="middle" fill="#3a2a00" fontSize="14" fontWeight="800" fontFamily="Inter, sans-serif">
          ₵
        </text>
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
        <g ref={betGroupRef} onClick={cashOut} role="button" style={{ cursor: "pointer" }}>
          <rect ref={betRef} x="214" y="358" width="114" height="56" rx="16" fill="#3dff6a" />
          <text
            ref={cashRef}
            x="271"
            y="378"
            textAnchor="middle"
            fill="#083016"
            fontSize="13"
            fontWeight="800"
            fontFamily="Inter, sans-serif"
          >
            100.00
          </text>
          <text ref={labelRef} x="271" y="396" textAnchor="middle" fill="#083016" fontSize="11" fontWeight="800" fontFamily="Inter, sans-serif">
            BET
          </text>
        </g>
        <text x="90" y="390" textAnchor="middle" fill="#ffffff" fontSize="20" fontWeight="800" fontFamily="Inter, sans-serif">
          100.00
        </text>
      </g>
    </svg>
  );
}
