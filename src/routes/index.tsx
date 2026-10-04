import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plane, Sparkles } from "lucide-react";
import { AviatorBoard } from "@/components/aviator-board";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getApprovedTestimonies, getSportyLink } from "@/lib/admin-snapshot";
import { clearPending } from "@/lib/pending-registration";
import { openTask } from "@/lib/task-order";
import { useLiveStorefront } from "@/lib/storefront-live";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { ref?: string } => {
    const ref = typeof search.ref === "string" ? search.ref.trim() : "";
    return ref ? { ref } : {};
  },
  component: Home,
});

const CALLS = [
  { n: 4821, label: "Safer cash-out window", x: "2.14x" },
  { n: 4820, label: "Hold — high volatility", x: "1.42x" },
  { n: 4819, label: "Exit flagged", x: "3.08x" },
  { n: 4822, label: "Watch the climb", x: "1.87x" },
  { n: 4823, label: "Safer cash-out window", x: "2.55x" },
  { n: 4824, label: "Exit flagged", x: "4.62x" },
];

function Home() {
  const navigate = useNavigate();
  const { ref } = Route.useSearch();
  const { user, isPending } = useCurrentUserState();
  const store = useLiveStorefront();
  const signedIn = !isPending && Boolean(user) && !user?.isDevFallback;
  const [tick, setTick] = useState(0);
  const [testimonies, setTestimonies] = useState<
    { name: string; place: string; text: string; stars: number }[]
  >([]);
  const [activeTestimony, setActiveTestimony] = useState(0);
  const [testimoniesLoading, setTestimoniesLoading] = useState(true);
  const [testimoniesError, setTestimoniesError] = useState(false);

  async function openAccount() {
    if (isPending) return;
    if (!signedIn) {
      await navigate({ to: "/register" });
      return;
    }
    await openTask(navigate, await getSportyLink());
  }

  useEffect(() => {
    clearPending();
  }, []);

  useEffect(() => {
    if (ref) window.localStorage.setItem("aviator-ref", ref.slice(0, 80));
  }, [ref]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 3500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let current = true;
    const loadTestimonies = () => {
      void getApprovedTestimonies()
        .then((rows) => {
          if (!current) return;
          setTestimonies(rows);
          setActiveTestimony((index) => index % Math.max(rows.length, 1));
          setTestimoniesError(false);
          setTestimoniesLoading(false);
        })
        .catch(() => {
          if (!current) return;
          setTestimoniesError(true);
          setTestimoniesLoading(false);
        });
    };
    loadTestimonies();
    const refreshId = window.setInterval(loadTestimonies, 30000);
    return () => {
      current = false;
      window.clearInterval(refreshId);
    };
  }, []);

  useEffect(() => {
    if (testimonies.length < 2) return;
    const id = window.setInterval(
      () => setActiveTestimony((index) => (index + 1) % testimonies.length),
      6000,
    );
    return () => window.clearInterval(id);
  }, [testimonies.length]);

  const rows = [0, 1, 2].map((offset) => CALLS[(tick + offset) % CALLS.length]);
  const testimony = testimonies[activeTestimony];

  return (
    <div className="home-theme min-h-dvh text-white">
      <SiteHeader />
      <div className="ticker-band border-y border-red/30 bg-[#170807] px-4 py-3 text-center" aria-live="polite">
        {testimoniesError ? (
          <p className="text-sm font-semibold text-white/75">Testimonies are temporarily unavailable.</p>
        ) : testimony ? (
          <article className="home-testimony mx-auto max-w-4xl" key={`${testimony.name}-${activeTestimony}`}>
            <p className="text-sm leading-relaxed text-white/90">&ldquo;{testimony.text}&rdquo;</p>
            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 text-xs">
              <span className="font-extrabold text-gold">{testimony.name}</span>
              {testimony.place ? <span className="text-white/55">{testimony.place}</span> : null}
              <span className="sr-only">{testimony.stars} out of 5 stars</span>
              <span aria-hidden="true" className="text-gold">{"★".repeat(testimony.stars)}</span>
            </div>
          </article>
        ) : (
          <p className="text-sm font-semibold text-white/75">
            {testimoniesLoading ? "Loading approved testimonies…" : "Approved testimonies will appear here."}
          </p>
        )}
      </div>

      <div className="hero-layout hero-glow">
        <div className="hero-copy">
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/70 px-3 py-1.5 text-xs font-extrabold tracking-widest text-gold uppercase">
          <span className="live-dot size-2 rounded-full bg-red" />
          Live Casino
        </p>
        <svg className="casino-monster" viewBox="0 0 72 72" aria-hidden="true">
          <path
            d="M16 27 10 9l18 10a25 25 0 0 1 16 0L62 9l-6 19a26 26 0 0 1 4 14c0 14-9 23-24 23S12 56 12 42a26 26 0 0 1 4-15Z"
            fill="#21090c"
            stroke="#e23b3b"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path d="M17 24 12 13l13 8M55 24l5-11-13 8" fill="none" stroke="#f0c14d" strokeWidth="2" strokeLinejoin="round" />
          <ellipse cx="27" cy="37" rx="6" ry="7.5" fill="#fff5df" />
          <ellipse className="monster-pupil" cx="28" cy="37" rx="2.5" ry="3.5" fill="#e23b3b" />
          <ellipse cx="45" cy="37" rx="6" ry="7.5" fill="#fff5df" />
          <ellipse className="monster-pupil monster-pupil-late" cx="46" cy="37" rx="2.5" ry="3.5" fill="#e23b3b" />
          <path d="M25 50q11 10 22 0l-3 9-5-6-4 7-4-7-5 6Z" fill="#f0c14d" stroke="#f0c14d" strokeLinejoin="round" />
        </svg>
        <h1 className="casino-title text-[2.35rem] leading-tight font-black tracking-tight">
          <span>CASINO</span> <span className="casino-title-accent">ROOM</span>
        </h1>
        <h2 className="mt-3 text-xl font-extrabold text-gold">
          Live signal
        </h2>
        <p className="mt-5 rounded-r-xl border-l-2 border-red bg-black/35 px-4 py-3 text-left text-base leading-7 text-white/85 shadow-[0_8px_30px_rgba(0,0,0,0.18)] sm:text-lg sm:leading-8">
          Our system tracks live Aviator signals, decodes multiplier patterns, and delivers precise
          cash-out opportunities before the round finishes
        </p>
        {store && store.rates.length > 0 ? (
          <p className="mt-3 text-sm text-muted">
            {store.rates.map((rate) => `${rate.country} ${rate.unit}${rate.perGhs} per GHS`).join(" · ")}
          </p>
        ) : null}
        <div className="hero-actions">
          <button
            type="button"
            onClick={() => void openAccount()}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-red px-5 text-sm font-extrabold tracking-wide text-white"
          >
            GET STARTED
            <Sparkles className="size-4" aria-hidden />
          </button>
        </div>
        </div>

      </div>

      <main id="desk" className="page-wrap">
        <div className="desk-layout">
        <article className="overflow-hidden rounded-3xl border border-line bg-ink">
          <div className="relative aspect-[16/10] overflow-hidden bg-[#12081f]">
            <AviatorBoard />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full border border-red/50 bg-black/60 px-3 py-1.5 text-xs font-extrabold tracking-wide text-white">
              <span className="live-dot size-2 rounded-full bg-red" />
              LIVE BOARD
            </div>
          </div>
          <div className="px-4 py-4">
            <h3 className="hero-title text-2xl font-black tracking-tight">Aviator Predictor</h3>
            <p className="plane-theme mt-2 text-sm leading-relaxed">
              Open the live desk, read the predicted coefficient, and take the cash-out window
              before the plane flies.
            </p>
            <button
              type="button"
              onClick={() => void openAccount()}
              className="buy-pulse mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-red text-base font-extrabold text-white"
            >
              <span>Start Now</span>
            </button>
          </div>
        </article>

        <section className="relative mt-6 overflow-hidden rounded-3xl border border-red/20 bg-gradient-to-br from-[#1a0b0b] via-[#100707] to-black p-4 shadow-[0_20px_60px_rgba(0,0,0,0.3)] sm:p-5">
          <div className="pointer-events-none absolute -right-12 -top-16 size-48 rounded-full bg-red/10 blur-3xl" />
          <div className="relative mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold tracking-[0.22em] text-red uppercase">Live signals</p>
              <h2 className="mt-1 text-lg font-black tracking-tight text-white">Prediction feed</h2>
              <p className="mt-1 text-xs text-white/50">Recent round cash-out windows</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-extrabold tracking-wider text-emerald-300 uppercase">
              <span className="live-dot size-1.5 rounded-full bg-emerald-400" />
              Live
            </span>
          </div>
          <ul className="relative space-y-2.5">
            {rows.map((row, index) => (
              <li
                key={row.n}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] px-3 py-3 transition-colors hover:border-red/25 hover:bg-white/[0.06] sm:px-4"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-red/20 bg-red/10 text-xs font-black tabular-nums text-red">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-extrabold text-white">
                    <Plane className="size-3.5 shrink-0 text-gold" aria-hidden />
                    <span className="truncate">Round {row.n}</span>
                  </span>
                  <span className="mt-1 block truncate text-xs text-white/50">{row.label}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[9px] font-bold tracking-[0.16em] text-white/35 uppercase">Window</span>
                  <span className="mt-0.5 block text-lg font-black tabular-nums text-gold">{row.x}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
