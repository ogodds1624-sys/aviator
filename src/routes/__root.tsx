import { createRootRoute, HeadContent, Outlet, Scripts, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth/provider";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { enforceCompletedAccount } from "@/lib/completed-account";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { SupportChat } from "@/components/support-chat";
import appCss from "../styles.css?url";

const APP_NAME = "AVIATOR HACK";

const PRESSABLE = "button, a, input, textarea, select, option, label, summary, [role='button'], [role='link']";

let clearingIncomplete = false;

function CompletedSession() {
  const { user, isPending } = useCurrentUserState();

  useEffect(() => {
    if (isPending || user?.isDevFallback || clearingIncomplete) return;
    let stop = false;
    void enforceCompletedAccount()
      .then((result) => {
        if (stop || result.completed || !result.stale || clearingIncomplete) return;
        clearingIncomplete = true;
        void signOut("/").catch(() => {
          window.location.href = "/";
        });
      })
      .catch(() => {
        // A failed check must not send a finished account away.
      });
    return () => {
      stop = true;
    };
  }, [isPending, user]);

  return null;
}

function TapBounce() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const quiet = path !== "/";

  useEffect(() => {
    const stamp = "aviator-cleared-2026-10-01";
    if (window.localStorage.getItem(stamp) === "1") return;
    window.localStorage.setItem(stamp, "1");
    for (const key of [
      "aviator-hack-email",
      "aviator-ref",
      "aviator-country",
      "aviator-hack-sportybet",
      "aviator-session",
      "aviator-tx-notice",
    ]) {
      window.localStorage.removeItem(key);
    }
    window.sessionStorage.removeItem("aviator-partner");
    window.sessionStorage.removeItem("aviator-admin-open");
    window.sessionStorage.removeItem("grok-auth.bearer-token");
    window.sessionStorage.removeItem("aviator-email-taken");
  }, []);

  useEffect(() => {
    if (quiet) return;
    let current: Element | null = null;

    const pick = (raw: Element) => {
      const control = raw.closest(PRESSABLE);
      if (!control || control === document.body || control === document.documentElement) return null;
      return control;
    };

    const lift = (event: PointerEvent) => {
      const raw = event.target;
      if (!(raw instanceof Element)) return;
      const next = pick(raw);
      if (next === current) return;
      current?.classList.remove("cursor-lift");
      current = next;
      current?.classList.add("cursor-lift");
    };

    const clear = () => {
      current?.classList.remove("cursor-lift");
      current = null;
    };

    document.addEventListener("pointerover", lift);
    document.addEventListener("pointerleave", clear);
    return () => {
      document.removeEventListener("pointerover", lift);
      document.removeEventListener("pointerleave", clear);
      clear();
    };
  }, [quiet]);
  return null;
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: APP_NAME },
      { name: "description", content: "Create an AVIATOR HACK account and open the live desk." },
      { name: "theme-color", content: "#e23b3b" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,800;1,900&display=swap",
      },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: () => (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <CompletedSession />
          <TapBounce />
          <Outlet />
          <SupportChat />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
