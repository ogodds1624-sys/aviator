import { memo, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { getSportyLink } from "@/lib/admin-snapshot";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const SiteHeader = memo(function SiteHeader() {
  const { user, isPending } = useCurrentUserState();
  const [linkState, setLinkState] = useState<{ id: string; linked: boolean } | null>(null);
  const [mounted, setMounted] = useState(false);
  const userId = user && !user.isDevFallback ? user.id : "";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!userId) return;
    let stop = false;
    void getSportyLink()
      .then((link) => {
        if (!stop) setLinkState({ id: userId, linked: link.linked });
      })
      .catch(() => {
        if (!stop) setLinkState({ id: userId, linked: false });
      });
    return () => {
      stop = true;
    };
  }, [userId]);

  const known = linkState?.id === userId ? linkState.linked : null;
  const registered = Boolean(userId) && known === true;
  const checking = Boolean(userId) && known === null;

  return (
    <header className="site-header sticky top-0 z-40 bg-ink">
      <Link to="/" className="flex min-w-0 flex-1 items-center gap-2 text-white no-underline">
        <span className="brand-mark header-plane-mark" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <defs>
              <linearGradient id="header-plane-metal" x1="12" y1="9" x2="34" y2="39" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFF8E9" />
                <stop offset=".38" stopColor="#D9DDE5" />
                <stop offset=".72" stopColor="#8D96A5" />
                <stop offset="1" stopColor="#F0C14D" />
              </linearGradient>
              <linearGradient id="header-plane-red" x1="14" y1="30" x2="34" y2="15" gradientUnits="userSpaceOnUse">
                <stop stopColor="#A71922" />
                <stop offset="1" stopColor="#F24A4F" />
              </linearGradient>
            </defs>
            <circle cx="24" cy="24" r="22" fill="#110D11" stroke="#6D2328" strokeWidth="1.25" />
            <circle cx="24" cy="24" r="18.5" stroke="rgba(240,193,77,.3)" strokeWidth=".7" />
            <path
              d="M22.15 39.1V23.7L8.7 31.1l-.9-3.4 13.2-11.1V11.4c0-4.25 1.3-7.1 3-7.1s3 2.85 3 7.1v5.2l13.2 11.1-.9 3.4-13.45-7.4v15.4l4.2 3.5v1.2L24 42.1l-5.05 1.7v-1.2l3.2-3.5Z"
              fill="url(#header-plane-metal)"
              stroke="#FFF6E6"
              strokeWidth=".65"
              strokeLinejoin="round"
            />
            <path d="m24 5.7-.55 11.15h1.1L24 5.7Z" fill="#FFFDF6" opacity=".9" />
            <path d="m11 29.1 10-8.3v2l-8.9 5.8L11 29.1Zm26 0-10-8.3v2l8.9 5.8 1.1.5Z" fill="url(#header-plane-red)" />
            <path d="M22.2 17.9h3.6v4.2h-3.6z" fill="#222833" stroke="#F5D78B" strokeWidth=".45" />
            <path d="M22.15 34.8h3.7" stroke="#7B1D24" strokeWidth=".7" />
            <path d="M22 39.1h4" stroke="#F7E8C5" strokeWidth=".55" />
          </svg>
        </span>
        <span className="truncate text-sm leading-none font-black tracking-tight italic sm:text-base">
          CASINO <span className="text-red">ROOM</span>
        </span>
      </Link>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {!mounted || checking || (isPending && !userId) ? (
          <div className="h-9 w-16 animate-pulse rounded-full bg-white/10 sm:w-24" aria-hidden />
        ) : registered ? (
          <div className="text-white">
            <UserButton />
          </div>
        ) : (
          <>
            <Link
              to="/login"
              className="inline-flex h-9 items-center justify-center rounded-full border border-white/30 px-3 text-xs font-bold text-white no-underline sm:h-10 sm:px-4 sm:text-sm"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="inline-flex h-9 items-center justify-center rounded-full bg-red px-3 text-xs font-bold text-white no-underline sm:h-10 sm:px-4 sm:text-sm"
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </header>
  );
});
