import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PREDICTOR_URL, clearSession, readSession, sessionLeft } from "@/lib/desk-session";
import { getSportyLink } from "@/lib/admin-snapshot";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/session")({
  component: SessionPage,
});

function SessionPage() {
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [left, setLeft] = useState<number | null>(null);
  const [mins, setMins] = useState(0);

  useEffect(() => {
    if (isPending) return;
    const tick = () => {
      const session = readSession();
      const ms = sessionLeft();
      if (!session || ms <= 0) {
        clearSession();
        if (!user || user.isDevFallback) {
          void navigate({ to: "/login" });
          return;
        }
        void getSportyLink().then((link) => {
          void navigate({
            to: !link.linked ? "/connect" : link.country === "Nigeria" ? "/nigeria-pay" : "/packages",
          });
        });
        return;
      }
      setMins(session.mins);
      setLeft(ms);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [navigate, isPending, user]);

  if (left == null) return null;
  const total = Math.ceil(left / 1000);
  const clock = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;

  return (
    <main className="flex h-dvh flex-col bg-ink text-white">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <p className="text-xs font-extrabold tracking-[0.16em]">SESSION</p>
        <p className="text-sm text-white/60">{mins} mins</p>
        <p className={"font-mono text-xl font-black " + (total <= 30 ? "text-red" : "text-[#3dde6a]")}>{clock}</p>
      </div>
      <iframe title="Aviator Predictor" src={PREDICTOR_URL} className="min-h-0 w-full flex-1 border-0 bg-white" />
    </main>
  );
}
