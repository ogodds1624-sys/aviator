import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function SiteHeader() {
  const { user, isPending } = useCurrentUserState();
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    setReturning(Boolean(window.localStorage.getItem("aviator-hack-email")));
  }, []);

  return (
    <header className="site-header sticky top-0 z-40 bg-ink">
      <Link to="/" className="flex min-w-0 flex-1 items-center gap-2 text-white no-underline">
        <img
          src="/media/aviator-mark.png"
          alt="Aviator"
          width="36"
          height="36"
          className="brand-mark"
        />
        <span className="truncate text-sm leading-none font-black tracking-tight italic sm:text-base">
          AVIATOR <span className="text-red">HACK</span>
        </span>
      </Link>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {isPending ? (
          <div className="h-9 w-16 animate-pulse rounded-full bg-white/10 sm:w-24" aria-hidden />
        ) : user ? (
          <div className="text-white">
            <UserButton />
          </div>
        ) : (
          <>
            <Link
              to="/login"
              className="inline-flex h-9 items-center justify-center rounded-full border border-white/30 px-3 text-xs font-bold text-white no-underline sm:h-10 sm:px-4 sm:text-sm"
            >
              Log In
            </Link>
            {returning ? null : (
              <Link
                to="/register"
                className="inline-flex h-9 items-center justify-center rounded-full bg-red px-3 text-xs font-bold text-white no-underline sm:h-10 sm:px-4 sm:text-sm"
              >
                Sign Up
              </Link>
            )}
          </>
        )}
      </div>
    </header>
  );
}
