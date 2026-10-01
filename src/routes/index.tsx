import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Plane, Sparkles } from "lucide-react";
import { AviatorBoard } from "@/components/aviator-board";
import { SignalLoading } from "@/components/signal-loading";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getSportyLink } from "@/lib/admin-snapshot";
import { sessionLeft } from "@/lib/desk-session";

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
  const [linked, setLinked] = useState(false);
  const [country, setCountry] = useState<"Ghana" | "Nigeria" | null>(null);
  const signedIn = !isPending && Boolean(user) && !user?.isDevFallback;
  const [loading, setLoading] = useState(false);
  const [signalOpen, setSignalOpen] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (isPending || !user || user.isDevFallback) {
      setLinked(false);
      setCountry(null);
      return;
    }
    void getSportyLink()
      .then((link) => {
        setLinked(link.linked);
        setCountry(link.country);
      })
      .catch(() => {
        setLinked(false);
        setCountry(null);
      });
  }, [isPending, user]);

  useEffect(() => {
    if (!loading) return;
    const id = window.setTimeout(() => {
      void (async () => {
        const link = await getSportyLink();
        void navigate({
          to: link.linked ? (sessionLeft() > 0 ? "/session" : link.country === "Nigeria" ? "/nigeria-pay" : "/packages") : "/connect",
        });
      })();
    }, 3000);
    return () => window.clearTimeout(id);
  }, [loading, navigate]);

  useEffect(() => {
    if (!signalOpen || isPending) return;
    const id = window.setTimeout(() => {
      if (signedIn && linked) {
        void navigate({
          to: country === "Nigeria" ? "/nigeria-pay" : "/packages",
          search: country === "Nigeria" ? {} : { stay: 1 },
          viewTransition: true,
        });
      } else if (signedIn) {
        void navigate({ to: "/connect", viewTransition: true });
      } else {
        void navigate({ to: "/login", viewTransition: true });
      }
    }, 2000);
    return () => window.clearTimeout(id);
  }, [signalOpen, isPending, signedIn, linked, country, navigate]);

  useEffect(() => {
    if (ref) window.localStorage.setItem("aviator-ref", ref);
  }, [ref]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 3500);
    return () => window.clearInterval(id);
  }, []);

  function openDesk() {
    if (isPending) return;
    if (!user || user.isDevFallback) {
      void navigate({ to: "/login", viewTransition: true });
      return;
    }
    if (!linked) {
      void navigate({ to: "/connect", viewTransition: true });
      return;
    }
    void navigate({
      to: country === "Nigeria" ? "/nigeria-pay" : "/packages",
      search: country === "Nigeria" ? {} : { stay: 1 },
      viewTransition: true,
    });
  }

  function runSignal() {
    if (loading || isPending) return;
    if (signedIn) {
      if (!linked) {
        void navigate({ to: "/connect", viewTransition: true });
        return;
      }
    } else {
      const known = window.localStorage.getItem("aviator-hack-email");
      void navigate({ to: known ? "/login" : "/register", viewTransition: true });
      return;
    }
    setLoading(true);
  }

  const rows = [0, 1, 2].map((offset) => CALLS[(tick + offset) % CALLS.length]);
  const tape = [...CALLS, ...CALLS];

  return (
    <div className="min-h-dvh bg-ink text-white">
      {loading || signalOpen ? <SignalLoading /> : null}
      <SiteHeader />
      <div className="ticker-band bg-red py-2 text-sm font-extrabold">
        <div className="ticker-track flex w-max gap-8 whitespace-nowrap">
          {tape.map((call, index) => (
            <span key={`${call.n}-${index}`} className="inline-flex items-center gap-3">
              Aviator · Round {call.n} — {call.x} window
              <span className="size-1.5 rounded-full bg-white/80" />
            </span>
          ))}
        </div>
      </div>

      <div className="hero-layout hero-glow">
        <div className="hero-copy">
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/70 px-3 py-1.5 text-xs font-extrabold tracking-widest text-gold uppercase">
          <span className="live-dot size-2 rounded-full bg-red" />
          Live Aviator Hack
        </p>
        <h1 className="hero-title float-loop text-[2.35rem] leading-none font-black tracking-tight">
          AVIATOR HACK
        </h1>
        <h2 className="float-loop mt-3 text-xl font-extrabold text-gold [animation-delay:1.5s]">
          Live signal
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted">
          This site reads the live Aviator signal, breaks the multiplier pattern, and hands you the
          next cash-out window before the plane flies.
        </p>
        <div className="hero-actions">
          <button
            type="button"
            onClick={runSignal}
            disabled={loading}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-red px-5 text-sm font-extrabold tracking-wide text-white"
          >
            GET STARTED
            <Sparkles className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={openDesk}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/20 px-5 text-sm font-bold text-white"
          >
            See the desk
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
        </div>

      <div className="phone-frame">
        <span className="absolute top-28 left-3 z-10 h-8 w-1 rounded-l bg-zinc-500" />
        <span className="absolute top-40 left-3 z-10 h-14 w-1 rounded-l bg-zinc-500" />
        <span className="absolute top-36 right-3 z-10 h-20 w-1 rounded-r bg-zinc-500" />
        <div className="rounded-[2.8rem] bg-gradient-to-br from-zinc-400 via-zinc-700 to-black p-[3px] shadow-[0_28px_70px_rgba(0,0,0,0.55)]">
          <div className="relative overflow-hidden rounded-[2.55rem] bg-black">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-7 pt-2.5 text-[11px] font-semibold text-white">
              <span>9:41</span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-4 rounded-[3px] border border-white">
                  <span className="block h-full w-3/4 bg-white" />
                </span>
              </span>
            </div>
            <div className="pointer-events-none absolute top-2 left-1/2 z-30 h-[26px] w-24 -translate-x-1/2 rounded-full bg-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]" />
            <div className="pt-8">
              <AviatorBoard />
            </div>
            <div className="flex justify-center bg-[#070707] pt-1 pb-2">
              <span className="h-1.5 w-32 rounded-full bg-white/85" />
            </div>
          </div>
        </div>
      </div>
      </div>

      <main id="desk" className="page-wrap">
        <div className="desk-layout">
        <article className="overflow-hidden rounded-3xl border border-line bg-ink">
          <div className="relative aspect-[16/10] overflow-hidden bg-[#12081f]">
            <img
              src="/media/aviator.jpg"
              alt="Aviator live round"
              width={960}
              height={600}
              className="h-full w-full object-cover"
              decoding="async"
            />
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
            <div className="mt-3 mb-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-gold/35 bg-gold/10 px-3 py-1.5 text-xs font-bold text-gold">
                Live Signals
              </span>
              <span className="rounded-full border border-gold/35 bg-gold/10 px-3 py-1.5 text-xs font-bold text-gold">
                Predicted Coefficient
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!isPending && !signalOpen) setSignalOpen(true);
              }}
              disabled={signalOpen}
              className="buy-pulse flex h-12 w-full items-center justify-center rounded-xl bg-red text-base font-extrabold text-gold disabled:opacity-70"
            >
              <span>HACK SIGNAL</span>
            </button>
          </div>
        </article>

        <section className="mt-6 rounded-2xl border border-line bg-ink p-3.5">
          <div className="mb-2.5 flex items-center justify-between text-xs font-extrabold tracking-widest text-muted">
            <span>PREDICTION FEED</span>
            <span className="inline-flex items-center gap-1.5 font-semibold tracking-normal normal-case">
              <span className="live-dot size-2 rounded-full bg-red" />
              Live
            </span>
          </div>
          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.n}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-panel px-3 py-3"
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-bold">
                    <Plane className="size-4 text-gold" aria-hidden />
                    Aviator · Round {row.n}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{row.label}</span>
                </span>
                <span className="text-base font-extrabold text-gold">{row.x}</span>
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
