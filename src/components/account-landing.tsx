import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { SignalLoading } from "@/components/signal-loading";
import { authClient, authEnabled } from "@/lib/auth/client";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getSportyLink, savePlayerCountry } from "@/lib/admin-snapshot";
import { sessionLeft } from "@/lib/desk-session";
import { rememberReferral } from "@/lib/remember-ref";

type Mode = "register" | "login";

const REMEMBERED_EMAIL = "aviator-hack-email";

export function AccountLanding({ mode }: { mode: Mode }) {
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [countryStep, setCountryStep] = useState(false);
  const [countryWait, setCountryWait] = useState(false);
  const [taken, setTaken] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const holdCountry = useRef(false);
  const register = mode === "register";

  async function continueAfterAccount() {
    const link = await getSportyLink();
    if (link.linked) {
      if (sessionLeft() > 0) {
        await navigate({ to: "/session" });
        return;
      }
      await navigate({ to: link.country === "Nigeria" ? "/nigeria-pay" : "/packages" });
      return;
    }
    await navigate({ to: "/" });
  }

  useEffect(() => {
    if (holdCountry.current || countryStep) return;
    if (!isPending && user && !user.isDevFallback) {
      void continueAfterAccount();
    }
  }, [isPending, user, navigate, countryStep]);

  useEffect(() => {
    const saved = window.localStorage.getItem(REMEMBERED_EMAIL);
    if (saved) setEmail(saved);
    if (!register && window.sessionStorage.getItem("aviator-email-taken") === "1") {
      setTaken(true);
      window.sessionStorage.removeItem("aviator-email-taken");
    }
    const ref = new URLSearchParams(window.location.search).get("ref") || window.localStorage.getItem("aviator-ref");
    if (ref) window.localStorage.setItem("aviator-ref", ref);
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!authEnabled) {
      setError("Accounts are not available right now.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const trimmed = email.trim();
      const result = register
        ? await authClient.signUp.email({
            name: name.trim(),
            email: trimmed,
            password,
            rememberMe: true,
            callbackURL: "/register",
          })
        : await authClient.signIn.email({
            email: trimmed,
            password,
            rememberMe: true,
            callbackURL: "/",
          });
      if (result.error) {
        const message = result.error.message ?? "";
        if (register && /exist|already|registered|duplicate/i.test(message)) {
          window.localStorage.setItem(REMEMBERED_EMAIL, trimmed);
          window.sessionStorage.setItem("aviator-email-taken", "1");
          await navigate({ to: "/login" });
          return;
        }
        setError(message || "Could not save that account.");
        return;
      }
      window.localStorage.setItem(REMEMBERED_EMAIL, trimmed);
      await rememberReferral();
      if (!register) return;
      holdCountry.current = true;
      setCountryStep(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that account.");
    } finally {
      setBusy(false);
    }
  }

  async function chooseCountry(country: "Ghana" | "Nigeria") {
    if (countryWait) return;
    await rememberReferral();
    const saved = await savePlayerCountry({ data: { country } });
    const locked = saved.country;
    window.localStorage.setItem("aviator-country", locked);
    if (saved.locked) {
      await navigate({ to: locked === "Nigeria" ? "/nigeria-pay" : "/packages", viewTransition: true });
      return;
    }
    setCountryWait(true);
  }

  useEffect(() => {
    if (!countryWait) return;
    const id = window.setTimeout(() => {
      window.sessionStorage.setItem("aviator-connect-once", "1");
      void navigate({ to: "/connect", viewTransition: true });
    }, 2000);
    return () => window.clearTimeout(id);
  }, [countryWait, navigate]);

  if (isPending || (user && !user.isDevFallback && !countryStep)) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-ink">
        <SignalLoading />
      </main>
    );
  }

  if (countryStep) {
    return (
      <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-8">
        <div className="plane-sky" aria-hidden>
          <video className="plane-sky-video" src="/media/plane-sky.mp4" autoPlay muted loop playsInline />
          <div className="plane-sky-shade" />
        </div>
        {countryWait ? <SignalLoading /> : null}
        <section className="menu-pop relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-black/55 px-5 py-6 text-white">
          <h1 className="text-center text-2xl font-black tracking-tight">Where are you playing from?</h1>
          <div className="mt-5 grid gap-3">
            <button
              type="button"
              onClick={() => void chooseCountry("Ghana")}
              className="buy-pulse flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-red text-base font-extrabold tracking-wide text-white"
            >
              <span className="inline-flex items-center gap-3">
                <svg viewBox="0 0 24 16" className="h-6 w-9 rounded-sm" aria-hidden>
                  <rect width="24" height="5.34" fill="#ce1126" />
                  <rect y="5.33" width="24" height="5.34" fill="#fcd116" />
                  <rect y="10.66" width="24" height="5.34" fill="#006b3f" />
                  <polygon
                    points="12,6.2 12.7,8.2 14.8,8.2 13.1,9.4 13.8,11.4 12,10.2 10.2,11.4 10.9,9.4 9.2,8.2 11.3,8.2"
                    fill="#000"
                  />
                </svg>
                Ghana
              </span>
            </button>
            <button
              type="button"
              onClick={() => void chooseCountry("Nigeria")}
              style={{ animationDelay: "0.2s" }}
              className="buy-pulse flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-red text-base font-extrabold tracking-wide text-white"
            >
              <span className="inline-flex items-center gap-3">
                <svg viewBox="0 0 24 16" className="h-6 w-9 rounded-sm" aria-hidden>
                  <rect width="8" height="16" fill="#008751" />
                  <rect x="8" width="8" height="16" fill="#fff" />
                  <rect x="16" width="8" height="16" fill="#008751" />
                </svg>
                Nigeria
              </span>
            </button>
          </div>
          <button
            type="button"
            disabled={signingOut || countryWait}
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

  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink px-4 py-8">
      <section className="w-full max-w-md rounded-3xl border border-line bg-panel px-5 py-5 text-white">
        <Link
          to="/"
          className="mb-4 inline-flex h-7 items-center justify-center rounded-lg border border-white/5 bg-black/20 px-2 text-[10px] font-bold tracking-wide text-white/25 no-underline"
        >
          ← BACK HOME
        </Link>
        <div className="mt-3 mb-5 flex items-center justify-center gap-2.5">
          <img
            src="/media/aviator-mark.png"
            alt="Aviator"
            width="48"
            height="36"
            className="brand-mark brand-mark-lg"
          />
          <span className="text-xl font-extrabold tracking-tight">AVIATOR HACK</span>
        </div>
        <h1 className="text-center text-2xl font-black tracking-tight">
          {register ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 mb-5 text-center text-sm leading-relaxed text-white">
          {register
            ? "Register once. This device remembers the login so you can come back anytime."
            : "Use the email and password you registered with. This device keeps you signed in."}
        </p>
        <div className="mb-5 grid grid-cols-2 border-b border-line text-center text-base font-extrabold">
          <Link
            to="/login"
            className={
              "border-b-2 py-3 text-white no-underline " +
              (register ? "border-transparent" : "border-red")
            }
          >
            Log in
          </Link>
          <Link
            to="/register"
            className={
              "border-b-2 py-3 text-white no-underline " +
              (register ? "border-red" : "border-transparent")
            }
          >
            Register
          </Link>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          {register ? (
            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold tracking-wide">FULL NAME</span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder="Your name"
                className="h-12 w-full rounded-xl border border-line bg-ink px-3 text-base text-white outline-none placeholder:text-white/40 focus:border-red"
              />
            </label>
          ) : null}
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold tracking-wide">EMAIL ADDRESS</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              className="h-12 w-full rounded-xl border border-line bg-ink px-3 text-base text-white outline-none placeholder:text-white/40 focus:border-red"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold tracking-wide">PASSWORD</span>
            <span className="relative block">
              <input
                required
                minLength={8}
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={register ? "new-password" : "current-password"}
                placeholder="At least 8 characters"
                className="h-12 w-full rounded-xl border border-line bg-ink px-3 pr-12 text-base text-white outline-none placeholder:text-white/40 focus:border-red"
              />
              <button
                type="button"
                className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center text-white"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </span>
          </label>
          {taken ? (
            <p className="text-sm font-medium text-gold" role="status">
              This email is already registered. Log in with it.
            </p>
          ) : null}
          {error ? (
            <p className="text-sm font-medium text-red" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="h-12 w-full rounded-xl bg-red text-base font-extrabold text-white shadow-lg disabled:opacity-60"
          >
            {busy ? "Saving…" : register ? "Create account" : "Log in"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-white">
          {register ? (
            <>
              Already registered?{" "}
              <Link to="/login" className="font-extrabold text-red no-underline">
                Log in
              </Link>
            </>
          ) : (
            <>
              Don't have an account?{" "}
              <Link to="/register" className="font-extrabold text-red no-underline">
                Register
              </Link>
            </>
          )}
        </p>
      </section>
    </main>
  );
}
