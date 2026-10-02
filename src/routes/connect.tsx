import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SignalLoading } from "@/components/signal-loading";
import { TaskSuccess } from "@/components/task-success";
import { getSportyLink, markAccountCompleted, savePlayerCountry, saveSportyLink } from "@/lib/admin-snapshot";
import { sportyNumberMatches } from "@/lib/onboarding-gate";
import { clearPending, readPending } from "@/lib/pending-registration";
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
  const [busy, setBusy] = useState(false);
  const [isTask3Done, setIsTask3Done] = useState(false);
  const [country, setCountry] = useState<"Ghana" | "Nigeria">("Ghana");
  const [ready, setReady] = useState(false);
  const nigeria = country === "Nigeria";

  useEffect(() => {
    let stop = false;
    void (async () => {
      const link = await getSportyLink();
      if (stop) return;
      if (link.linked) {
        clearPending();
        if (link.country === "Nigeria") {
          void navigate({ to: "/nigeria-pay" });
        } else {
          void navigate({ to: "/packages", search: { stay: 1 } });
        }
        return;
      }
      if (!link.signedIn) {
        clearPending();
        void navigate({ to: "/register" });
        return;
      }
      const pending = readPending();
      const stored = window.localStorage.getItem("aviator-country");
      const next =
        pending?.country ??
        link.country ??
        (stored === "Nigeria" || stored === "Ghana" ? stored : null);
      if (!next) {
        void navigate({ to: "/register" });
        return;
      }
      setCountry(next);
      setReady(true);
    })();
    return () => {
      stop = true;
    };
  }, [navigate]);

  function leaveConnect() {
    clearPending();
    void navigate({ to: "/" });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const digits = number.replace(/\D/g, "");
    if (!sportyNumberMatches(country, digits)) {
      setError(
        country === "Nigeria"
          ? "Enter an 11-digit SportyBet number, starting with 0."
          : "Enter a 10-digit SportyBet number, starting with 0.",
      );
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await savePlayerCountry({ data: { country } });
      await saveSportyLink({ data: { number: digits } });
      await markAccountCompleted();
      const link = await getSportyLink();
      if (!link.linked) {
        setError("Could not confirm that SportyBet account.");
        return;
      }
      const pending = readPending();
      if (pending?.email) window.localStorage.setItem("aviator-hack-email", pending.email);
      window.localStorage.setItem("aviator-country", country);
      window.localStorage.setItem(STORAGE_KEY, digits);
      clearPending();
      try {
        await rememberReferral();
      } catch {
        // The account is already stored. A referral note must not undo that.
      }
      setIsTask3Done(true);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Could not save that account.");
    } finally {
      setBusy(false);
    }
  }

  async function continueToPackages() {
    if (!isTask3Done) return;
    const link = await getSportyLink();
    if (!link.linked) {
      setIsTask3Done(false);
      setError("Finish SportyBet before opening packages.");
      return;
    }
    if (link.country === "Nigeria") {
      await navigate({ to: "/nigeria-pay" });
      return;
    }
    await navigate({ to: "/packages", search: { stay: 1 } });
  }

  if (!ready) {
    return (
      <main className="grid min-h-dvh place-items-center bg-ink">
        <SignalLoading />
      </main>
    );
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10 text-white">
      <AviatorSky />
      {isTask3Done ? (
        <TaskSuccess
          title="Sporty account connected successfully"
          message="Your SportyBet account is saved. Continue when you are ready to open packages."
          ready={isTask3Done}
          onContinue={() => void continueToPackages()}
        />
      ) : (
      <section className="relative z-10 w-full max-w-md min-w-0 rounded-[28px] border border-white/10 bg-black/55 px-5 py-7">
        <button
          type="button"
          onClick={leaveConnect}
          className="mb-4 inline-flex h-7 items-center justify-center rounded-lg border border-white/5 bg-black/20 px-2 text-[10px] font-bold tracking-wide text-white/25"
        >
          ← BACK
        </button>
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
              disabled={busy}
              className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-red text-lg font-bold text-white disabled:opacity-60"
            >
              {busy ? "Saving…" : "Connect account"}
              <ArrowRight className="size-5" aria-hidden />
            </button>
          </form>
      </section>
      )}
    </main>
  );
}
