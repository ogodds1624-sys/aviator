import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Flame, Gem, Zap } from "lucide-react";
import { SignalLoading } from "@/components/signal-loading";
import { getSportyLink } from "@/lib/admin-snapshot";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useLiveStorefront } from "@/lib/storefront-live";
import { sessionLeft } from "@/lib/desk-session";

export const Route = createFileRoute("/packages")({
  validateSearch: (search: Record<string, unknown>): { rejected?: 1; stay?: 1 } => {
    const next: { rejected?: 1; stay?: 1 } = {};
    if (search.rejected === 1 || search.rejected === "1") next.rejected = 1;
    if (search.stay === 1 || search.stay === "1") next.stay = 1;
    return next;
  },
  component: PackagesPage,
});

const PACKAGES = [
  {
    price: 300,
    detail: "3 mins per session",
    icon: Zap,
  },
  {
    price: 400,
    detail: "5 mins per session",
    icon: Flame,
  },
  {
    price: 500,
    detail: "7 mins per session",
    icon: Gem,
  },
];

function PackagesPage() {
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const { rejected, stay } = Route.useSearch();
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<number | null>(null);
  const store = useLiveStorefront();
  const [alertOn, setAlertOn] = useState(Boolean(rejected));

  useEffect(() => {
    if (isPending) return;
    if (!user || user.isDevFallback) {
      void navigate({ to: "/register" });
      return;
    }
    void getSportyLink().then((link) => {
      if (!link.linked) {
        void navigate({ to: link.signedIn && link.country ? "/connect" : "/register" });
        return;
      }
      if (link.country === "Nigeria") {
        void navigate({ to: "/nigeria-pay", viewTransition: true });
        return;
      }
      setReady(true);
    });
  }, [isPending, user, navigate]);

  useEffect(() => {
    if (!rejected) return;
    const id = window.setTimeout(() => setAlertOn(false), 7000);
    return () => window.clearTimeout(id);
  }, [rejected]);

  useEffect(() => {
    if (stay) return;
    if (sessionLeft() > 0) void navigate({ to: "/session", viewTransition: true });
  }, [navigate, stay]);

  useEffect(() => {
    if (pending == null) return;
    const amount = pending;
    const id = window.setTimeout(() => {
      void navigate({ to: "/pay", search: { amount } });
    }, 2000);
    return () => window.clearTimeout(id);
  }, [pending, navigate]);

  if (!ready) {
    return (
      <main className="grid min-h-dvh place-items-center bg-ink">
        <SignalLoading />
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh overflow-hidden px-4 py-10 text-white">
      <div className="plane-sky" aria-hidden>
        <video className="plane-sky-video" src="/media/plane-sky.mp4" autoPlay muted loop playsInline />
        <div className="plane-sky-shade" />
      </div>
      {pending != null ? <SignalLoading /> : null}
      <div className="relative z-10 mx-auto w-full max-w-md">
        {alertOn ? (
          <div className="reject-banner mb-5 rounded-2xl border border-red bg-black/75 px-4 py-4 text-center" role="alert">
            <p className="text-sm font-extrabold tracking-wide text-red">PAYMENT REJECTED</p>
            <p className="mt-1 text-base font-bold text-white">Your payment was rejected. Choose a package and try again.</p>
          </div>
        ) : null}
        <Link
          to="/"
          className="mb-4 inline-flex h-7 items-center justify-center rounded-lg border border-white/5 bg-black/20 px-2 text-[10px] font-bold tracking-wide text-white/25 no-underline"
        >
          ← BACK HOME
        </Link>
        <h1 className="text-center text-3xl font-extrabold tracking-tight text-gold [text-shadow:0_2px_10px_rgba(0,0,0,0.9)]">
          Choose Your Package
        </h1>
        <p className="mt-2 text-center text-base font-extrabold text-gold [text-shadow:0_2px_10px_rgba(0,0,0,0.9)]">
          Buy session time · Use anytime
        </p>
        {store && store.rates.length > 0 ? (
          <p className="mt-3 text-center text-xs leading-relaxed text-white/70">
            Estimate only. Checkout still charges GHS.{" "}
            {store.rates.map((rate) => `${rate.country} ${rate.unit}${rate.perGhs} per GHS`).join(" · ")}
          </p>
        ) : null}
        <div className="mt-6 space-y-4">
          {PACKAGES.map((pack, index) => {
            const Icon = pack.icon;
            return (
              <article
                key={pack.price}
                className="rounded-3xl border border-line bg-panel px-4 py-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-3xl font-extrabold tracking-tight text-[#3dde6a]">
                      GHS {pack.price}
                    </h2>
                    <span className="rounded-full border border-red px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-red">
                      AVAILABLE
                    </span>
                  </div>
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-red/15 text-red">
                    <Icon className="size-5" aria-hidden />
                  </span>
                </div>
                <p className="mt-4 text-lg font-semibold text-white">{pack.detail}</p>
                <button
                  type="button"
                  disabled={pending != null}
                  onClick={() => setPending(pack.price)}
                  style={{ animationDelay: `${index * 0.2}s` }}
                  className="buy-pulse mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-red text-base font-extrabold tracking-wide text-white disabled:opacity-70"
                >
                  <span className="inline-flex items-center gap-2">
                    <ArrowRight className="size-4" aria-hidden />
                    GET GHS {pack.price}
                  </span>
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
