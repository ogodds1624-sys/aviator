import { useEffect, useState, type FormEvent } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { SignalLoading } from "@/components/signal-loading";
import { signOut } from "@/lib/auth/client";
import { getSportyLink, savePlayerCountry, saveSportyLink } from "@/lib/admin-snapshot";
import { sessionLeft } from "@/lib/desk-session";
import { rememberReferral } from "@/lib/remember-ref";

export const Route = createFileRoute("/connect")({
  component: ConnectPage,
});

const STORAGE_KEY = "aviator-hack-sportybet";

function GhanaFlag() {
  return (
    <svg viewBox="0 0 24 16" className="h-4 w-6 shrink-0" aria-hidden>
      <rect width="24" height="5.34" fill="#ce1126" />
      <rect y="5.33" width="24" height="5.34" fill="#fcd116" />
      <rect y="10.66" width="24" height="5.34" fill="#006b3f" />
      <polygon points="12,6.2 12.7,8.2 14.8,8.2 13.1,9.4 13.8,11.4 12,10.2 10.2,11.4 10.9,9.4 9.2,8.2 11.3,8.2" fill="#000" />
    </svg>
  );
}

function NigeriaFlag() {
  return (
    <svg viewBox="0 0 24 16" className="h-4 w-6 shrink-0" aria-hidden>
      <rect width="8" height="16" fill="#008751" />
      <rect x="8" width="8" height="16" fill="#fff" />
      <rect x="16" width="8" height="16" fill="#008751" />
    </svg>
  );
}

function AviatorSky() {
  return (
    <div className="aviator-sky" aria-hidden>
      <div className="aviator-rays" />
      <div className="aviator-sky-shade" />
    </div>
  );
}

function ConnectPage() {
  const navigate = useNavigate();
  const [number, setNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"form" | "loading" | "done" | "leaving">("form");
  const [country, setCountry] = useState<"Ghana" | "Nigeria">("Ghana");
  const [signingOut, setSigningOut] = useState(false);
  const [ready, setReady] = useState(false);
  const nigeria = country === "Nigeria";

  useEffect(() => {
    const saved = window.localStorage.getItem("aviator-country");
    if (saved === "Nigeria" || saved === "Ghana") setCountry(saved);
  }, []);

  useEffect(() => {
    void getSportyLink().then((link) => {
      if (link.linked) {
        void navigate({
          to: sessionLeft() > 0 ? "/session" : link.country === "Nigeria" ? "/nigeria-pay" : "/packages",
        });
        return;
      }
      setReady(true);
    });
  }, [navigate]);

  useEffect(() => {
    if (phase !== "loading") return;
    const id = window.setTimeout(() => setPhase("done"), 3000);
    return () => window.clearTimeout(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "done") return;
    const id = window.setTimeout(() => setPhase("leaving"), 2000);
    return () => window.clearTimeout(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "leaving") return;
    const id = window.setTimeout(() => {
      void navigate({ to: nigeria ? "/nigeria-pay" : "/packages" });
    }, 2000);
    return () => window.clearTimeout(id);
  }, [phase, navigate, nigeria]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const digits = number.replace(/\D/g, "");
    const ok = nigeria ? /^0\d{10}$/.test(digits) : /^0\d{9}$/.test(digits);
    if (!ok) {
      setError(nigeria ? "Enter an 11-digit SportyBet number, starting with 0." : "Enter a 10-digit SportyBet number, starting with 0.");
      return;
    }
    setError(null);
    const picked = window.localStorage.getItem("aviator-country");
    const saved =
      picked === "Nigeria" || picked === "Ghana" ? await savePlayerCountry({ data: { country: picked } }) : null;
    if (saved?.locked) {
      window.localStorage.setItem("aviator-country", saved.country);
      void navigate({ to: saved.country === "Nigeria" ? "/nigeria-pay" : "/packages", viewTransition: true });
      return;
    }
    try {
      await rememberReferral();
      await saveSportyLink({ data: { number: digits } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect that account.");
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, digits);
    setPhase("loading");
  }

  if (!ready && phase === "form") {
    return (
      <main className="grid min-h-dvh place-items-center bg-ink">
        <SignalLoading />
      </main>
    );
  }

  if (phase === "done" || phase === "leaving") {
    return (
      <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10 text-white">
        <AviatorSky />
        {phase === "leaving" ? <SignalLoading /> : null}
        <section className="relative z-10 w-full max-w-md rounded-[28px] border border-white/10 bg-black/55 px-6 py-16 text-center">
          <div className="mark-pop mx-auto grid size-16 place-items-center rounded-2xl bg-gradient-to-b from-[#4ade80] to-[#16a34a] shadow-[0_8px_16px_rgba(22,163,74,0.35)]">
            <Check className="size-9 text-white" strokeWidth={3} aria-hidden />
          </div>
          <h1 className="mt-8 text-2xl leading-tight font-extrabold tracking-tight sm:text-3xl">
            Sporty account connected
            <br />
            successfully
          </h1>
          <p className="mx-auto mt-5 max-w-sm text-base leading-relaxed text-muted">
            Your SportyBet account has been connected. A confirmation email is on its way.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10 text-white">
      <AviatorSky />
      {phase === "loading" ? <SignalLoading /> : null}
      <section className="relative z-10 w-full max-w-md min-w-0 rounded-[28px] border border-white/10 bg-black/55 px-5 py-7">
        <Link
          to="/"
          className="mb-4 inline-flex h-7 items-center justify-center rounded-lg border border-white/5 bg-black/20 px-2 text-[10px] font-bold tracking-wide text-white/25 no-underline"
        >
          ← BACK HOME
        </Link>
        <h1 className="mt-4 text-[28px] leading-tight font-extrabold tracking-tight">
          Connect your SportyBet account
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          Enter your SportyBet account number to link it to Aviator Hack.
        </p>
        <div className="my-8 flex justify-center">
          <span className="grid size-20 place-items-center rounded-[22px] bg-red text-5xl font-black text-white">
            S
          </span>
        </div>
        <form onSubmit={onSubmit}>
            <label htmlFor="sportybet" className="text-xs font-extrabold tracking-[0.14em] text-muted">
              SPORTYBET ACCOUNT NUMBER
            </label>
            <div className="mt-3 grid min-w-0 grid-cols-[6.25rem_minmax(0,1fr)] gap-2">
              <div className="flex h-14 min-w-0 items-center justify-center gap-1.5 rounded-2xl border border-line bg-ink px-2 text-sm font-semibold">
                {nigeria ? <NigeriaFlag /> : <GhanaFlag />}
                {nigeria ? "+234" : "+233"}
              </div>
              <input
                id="sportybet"
                inputMode="numeric"
                autoComplete="tel"
                placeholder={nigeria ? "08031234567" : "0244123456"}
                value={number}
                onChange={(event) => setNumber(event.target.value)}
                className="h-14 min-w-0 rounded-2xl border border-line bg-ink px-3 text-base text-white outline-none placeholder:text-white/40"
              />
            </div>
            {error ? <p className="mt-3 text-sm text-red">{error}</p> : null}
            <button
              type="submit"
              className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-red text-lg font-bold text-white"
            >
              Connect account
              <ArrowRight className="size-5" aria-hidden />
            </button>
          </form>
          <button
            type="button"
            disabled={signingOut}
            onClick={() => {
              setSigningOut(true);
              void signOut("/").catch(() => setSigningOut(false));
            }}
            className="mt-4 h-11 w-full rounded-2xl border border-white/15 bg-ink text-sm font-extrabold text-white disabled:opacity-60"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
      </section>
    </main>
  );
}
