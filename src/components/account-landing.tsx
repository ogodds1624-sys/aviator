import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { SignalLoading } from "@/components/signal-loading";
import { TaskSuccess } from "@/components/task-success";
import { authClient, authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getSportyLink, savePlayerCountry } from "@/lib/admin-snapshot";
import { clearPending, readPending, savePending } from "@/lib/pending-registration";
import { peekRegistrationEmail } from "@/lib/registration-email";
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
  const [savingCountry, setSavingCountry] = useState(false);
  const [isTask1Done, setIsTask1Done] = useState(false);
  const [isTask2Done, setIsTask2Done] = useState(false);
  const [taken, setTaken] = useState(false);
  const holdCountry = useRef(false);
  const stayOnRegister = useRef(false);
  const register = mode === "register";

  async function continueAfterAccount() {
    let link = await getSportyLink();
    for (let attempt = 0; attempt < 3 && link.signedIn === false; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      link = await getSportyLink();
    }
    if (link.linked) {
      if (link.country === "Nigeria") {
        await navigate({ to: "/nigeria-pay" });
        return;
      }
      await navigate({ to: "/packages", search: { stay: 1 } });
      return;
    }
    if (link.signedIn && link.country) {
      await navigate({ to: "/connect" });
      return;
    }
    if (link.signedIn) {
      holdCountry.current = true;
      setCountryStep(true);
      return;
    }
    window.sessionStorage.removeItem("aviator-register-connect");
    await navigate({ to: "/" });
  }

  useEffect(() => {
    if (holdCountry.current || countryStep || stayOnRegister.current || isTask1Done || isTask2Done) return;
    if (!isPending && user && !user.isDevFallback) {
      void continueAfterAccount();
    }
  }, [isPending, user, navigate, countryStep, isTask1Done, isTask2Done]);

  useEffect(() => {
    if (!holdCountry.current) clearPending();
    const saved = window.localStorage.getItem(REMEMBERED_EMAIL);
    if (saved && !register) setEmail(saved);
    if (!register && window.sessionStorage.getItem("aviator-email-taken") === "1") {
      setTaken(true);
      window.sessionStorage.removeItem("aviator-email-taken");
    }
    const ref = new URLSearchParams(window.location.search).get("ref") || window.localStorage.getItem("aviator-ref");
    if (ref) window.localStorage.setItem("aviator-ref", ref);
  }, [register]);

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
    const trimmedName = name.trim();
    const trimmed = email.trim().toLowerCase();
    if (register && trimmedName.length < 2) {
      setError("Enter your name.");
      return;
    }
    setBusy(true);
    if (register) {
      holdCountry.current = true;
      let lastError = "Could not save that account.";
      try {
        try {
          const existing = await peekRegistrationEmail({ data: { email: trimmed } });
          if (existing.taken) {
            const link = await getSportyLink();
            if (link.signedIn) {
              await continueAfterAccount();
              return;
            }
            holdCountry.current = false;
            window.localStorage.setItem(REMEMBERED_EMAIL, trimmed);
            window.sessionStorage.setItem("aviator-email-taken", "1");
            await navigate({ to: "/login" });
            return;
          }
        } catch {
          // A lookup failure still tries to create the session below.
        }
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const result = await authClient.signUp.email({
              name: trimmedName,
              email: trimmed,
              password,
              rememberMe: true,
            });
            if (!result.error) {
              window.localStorage.setItem(REMEMBERED_EMAIL, trimmed);
              savePending({
                name: trimmedName,
                email: trimmed,
                password,
                country: null,
                completionStatus: false,
              });
              let link = await getSportyLink();
              for (let check = 0; check < 3 && !link.signedIn; check += 1) {
                await new Promise((resolve) => setTimeout(resolve, 300));
                link = await getSportyLink();
              }
              if (!link.signedIn) {
                holdCountry.current = false;
                setError("Could not confirm that account.");
                return;
              }
              setIsTask1Done(true);
              return;
            }
            const failure = result.error as { message?: string; code?: string; status?: number; statusText?: string };
            const message = failure.message?.trim() || "";
            const code = failure.code ?? "";
            if (/exist|already|registered|duplicate/i.test(`${message} ${code}`)) {
              const link = await getSportyLink().catch(() => null);
              if (link?.signedIn) {
                await continueAfterAccount();
                return;
              }
              holdCountry.current = false;
              window.localStorage.setItem(REMEMBERED_EMAIL, trimmed);
              window.sessionStorage.setItem("aviator-email-taken", "1");
              await navigate({ to: "/login" });
              return;
            }
            lastError = message || failure.statusText?.trim() || "Could not save that account.";
            const status = failure.status ?? 0;
            if (message && status < 500) {
              holdCountry.current = false;
              setError(lastError);
              return;
            }
          } catch (err) {
            lastError = err instanceof Error && err.message ? err.message : "Could not save that account.";
          }
        }
        holdCountry.current = false;
        setError(lastError);
      } finally {
        setBusy(false);
      }
      return;
    }
    let lastError = "Could not save that account.";
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const result = await authClient.signIn.email({
            email: trimmed,
            password,
            rememberMe: true,
          });
          if (!result.error) {
            window.localStorage.setItem(REMEMBERED_EMAIL, trimmed);
            try {
              await rememberReferral();
            } catch {
              // The account is already stored. A referral note must not undo that.
            }
            await continueAfterAccount();
            return;
          }
          const failure = result.error as { message?: string; code?: string; status?: number; statusText?: string };
          const message = failure.message?.trim() || "";
          lastError = message || failure.statusText?.trim() || "Could not save that account.";
          const status = failure.status ?? 0;
          if (message && status < 500) {
            setError(lastError);
            return;
          }
        } catch (err) {
          lastError = err instanceof Error && err.message ? err.message : "Could not save that account.";
        }
      }
      setError(lastError);
    } finally {
      setBusy(false);
    }
  }

  async function chooseCountry(country: "Ghana" | "Nigeria") {
    if (savingCountry || isTask2Done) return;
    setError(null);
    setSavingCountry(true);
    try {
      await savePlayerCountry({ data: { country } });
      const link = await getSportyLink();
      if (link.country !== country) {
        setError("Could not confirm that country.");
        return;
      }
      const pending = readPending();
      if (pending) savePending({ ...pending, country, completionStatus: false });
      window.localStorage.setItem("aviator-country", country);
      setIsTask2Done(true);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Could not save that country.");
    } finally {
      setSavingCountry(false);
    }
  }

  async function continueToCountry() {
    if (!isTask1Done) return;
    const link = await getSportyLink();
    if (!link.signedIn) {
      setIsTask1Done(false);
      setError("Sign in before choosing a country.");
      return;
    }
    setCountryStep(true);
  }

  async function continueToSporty() {
    if (!isTask2Done) return;
    const link = await getSportyLink();
    if (!link.signedIn || (link.country !== "Ghana" && link.country !== "Nigeria")) {
      setIsTask2Done(false);
      setError("Choose Ghana or Nigeria before continuing.");
      return;
    }
    await navigate({ to: "/connect" });
  }

  function backToRegistration() {
    clearPending();
    holdCountry.current = false;
    stayOnRegister.current = true;
    setSavingCountry(false);
    setIsTask1Done(false);
    setIsTask2Done(false);
    setCountryStep(false);
    setName("");
    setEmail("");
    setPassword("");
    setError(null);
  }

  if (!countryStep && !isTask1Done && (isPending || (user && !user.isDevFallback && !stayOnRegister.current))) {
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
        {isTask2Done ? (
          <TaskSuccess
            title="Country saved"
            message="Your country is saved. Continue when you are ready to connect SportyBet."
            ready={isTask2Done}
            onContinue={() => void continueToSporty()}
          />
        ) : (
        <section className="menu-pop relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-black/55 px-5 py-6 text-white">
          <button
            type="button"
            onClick={backToRegistration}
            className="mb-4 inline-flex h-7 items-center justify-center rounded-lg border border-white/5 bg-black/20 px-2 text-[10px] font-bold tracking-wide text-white/25"
          >
            ← BACK
          </button>
          <h1 className="text-center text-2xl font-black tracking-tight">Where are you playing from?</h1>
          {error ? (
            <p className="mt-3 text-center text-sm font-medium text-red" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-5 grid gap-3">
            <button
              type="button"
              onClick={() => void chooseCountry("Ghana")}
              disabled={savingCountry}
              className="buy-pulse flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-red text-base font-extrabold tracking-wide text-white disabled:opacity-60"
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
              disabled={savingCountry}
              style={{ animationDelay: "0.2s" }}
              className="buy-pulse flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-red text-base font-extrabold tracking-wide text-white disabled:opacity-60"
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
        </section>
        )}
      </main>
    );
  }

  if (isTask1Done) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-ink px-4 py-8">
        <TaskSuccess
          title="Account created"
          message="Your account is saved. Continue when you are ready to choose a country."
          ready={isTask1Done}
          onContinue={() => void continueToCountry()}
        />
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
