import { memo, useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { getApprovedTestimonies, getSportyLink, submitTestimony } from "@/lib/admin-snapshot";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useLiveStorefront } from "@/lib/storefront-live";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/packages", label: "Packages" },
  { to: "/login", label: "Sign In" },
  { to: "/register", label: "Register" },
] as const;

export const SiteFooter = memo(function SiteFooter() {
  const [live, setLive] = useState<{ name: string; place: string; text: string; stars: number }[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [text, setText] = useState("");
  const [stars, setStars] = useState(5);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { user, isPending } = useCurrentUserState();
  const userId = user?.id ?? "";
  const devFallback = user?.isDevFallback === true;
  const [linked, setLinked] = useState(false);
  const signedIn = !isPending && Boolean(user) && !user?.isDevFallback && linked;
  const store = useLiveStorefront();
  const whatsapp = store?.whatsapp ?? "";
  const storiesRef = useRef<HTMLElement>(null);
  const [nearStories, setNearStories] = useState(false);

  useEffect(() => {
    const node = storiesRef.current;
    if (!node || !("IntersectionObserver" in window)) {
      setNearStories(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setNearStories(true);
      },
      { rootMargin: "480px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isPending || !userId || devFallback) {
      setLinked(false);
      return;
    }
    let current = true;
    void getSportyLink()
      .then((link) => {
        if (current) setLinked(link.linked);
      })
      .catch(() => {
        if (current) setLinked(false);
      });
    return () => {
      current = false;
    };
  }, [isPending, userId, devFallback]);

  useEffect(() => {
    if (!nearStories) return;
    let current = true;
    const load = () => {
      if (document.hidden) return;
      void getApprovedTestimonies()
        .then((rows) => {
          if (!current) return;
          setLive((currentRows) => (sameStories(currentRows, rows) ? currentRows : rows));
        })
        .catch(() => {
          if (current) setLive([]);
        });
    };
    load();
    const phone = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    const id = window.setInterval(load, phone ? 12000 : 3000);
    return () => {
      current = false;
      window.clearInterval(id);
    };
  }, [nearStories]);

  const stories = live;
  const chat = whatsapp ? `https://wa.me/${whatsapp}?text=${encodeURIComponent("Text us")}` : "";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNote(null);
    try {
      await submitTestimony({ data: { name, place, text, stars } });
      setName("");
      setPlace("");
      setText("");
      setStars(5);
      setNote("Testimony successfully sent.");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Could not send your testimony.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="below-fold mt-12">
      <section ref={storiesRef} className="overflow-hidden" aria-label="Testimonies">
        <h2 className="px-4 text-center text-xs font-extrabold tracking-[0.16em] text-gold">TESTIMONIES</h2>
        {stories.length === 0 ? (
          <p className="mt-4 px-4 text-center text-sm text-[#8b95a7]">Approved testimonies from the admin desk show here.</p>
        ) : (
        <div className="testimony-track mt-4 flex w-max gap-3 px-4">
          {[...stories, ...stories].map((item, index) => (
            <article
              key={`${item.name}-${index}`}
              className="w-72 shrink-0 rounded-2xl border border-white/10 bg-[#111111] px-4 py-4"
            >
              <Stars value={item.stars} />
              <p className="mt-2 text-sm leading-relaxed text-white/85">{item.text}</p>
              <p className="mt-3 text-sm font-extrabold">{item.name}</p>
              {item.place ? <p className="text-xs text-[#8b95a7]">{item.place}</p> : null}
            </article>
          ))}
        </div>
        )}
        <div className="mx-auto mt-4 w-full max-w-md px-4">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-red px-4 text-xs font-extrabold tracking-wide text-white"
          >
            SEND YOUR TESTIMONY
          </button>
          {open ? (
            <form onSubmit={(event) => void onSubmit(event)} className="mt-3 rounded-2xl border border-white/10 bg-[#111111] px-4 py-4">
              <label className="block text-xs font-bold tracking-[0.14em] text-[#9aa3b2]">
                NAME
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-ink px-3 text-sm font-semibold tracking-normal text-white outline-none"
                />
              </label>
              <label className="mt-3 block text-xs font-bold tracking-[0.14em] text-[#9aa3b2]">
                LOCATION
                <input
                  value={place}
                  onChange={(event) => setPlace(event.target.value)}
                  placeholder="Accra, Ghana"
                  className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-ink px-3 text-sm font-semibold tracking-normal text-white outline-none"
                />
              </label>
              <label className="mt-3 block text-xs font-bold tracking-[0.14em] text-[#9aa3b2]">
                TESTIMONY
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-ink px-3 py-2 text-sm font-semibold tracking-normal text-white outline-none"
                />
              </label>
              <p className="mt-3 text-xs font-bold tracking-[0.14em] text-[#9aa3b2]">STAR RATING</p>
              <div className="mt-1 flex gap-1">
                {Array.from({ length: 5 }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setStars(index + 1)}
                    className={"text-2xl leading-none " + (index < stars ? "text-gold" : "text-white/25")}
                    aria-label={`${index + 1} stars`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <button
                type="submit"
                disabled={busy}
                className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-red px-4 text-xs font-extrabold tracking-wide text-white disabled:opacity-60"
              >
                {busy ? "SENDING" : "SEND"}
              </button>
              {note ? <p className="mt-2 text-sm text-white/80">{note}</p> : null}
            </form>
          ) : null}
        </div>
      </section>

      <div className="relative mt-10">
        <footer className="border-t border-white/10 bg-[#070707] text-white">
          <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <section>
          <Link to="/" className="inline-flex items-center gap-2 text-white no-underline">
            <img src="/media/aviator-mark.webp" alt="" width="36" height="36" decoding="async" loading="lazy" className="size-9" />
            <span className="text-base font-black tracking-tight italic">
              CASINO <span className="text-red">ROOM</span>
            </span>
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-[#8b95a7]">
            Live Aviator signals, predicted cash-out windows, and session time when you are ready to play.
          </p>
        </section>

        <section>
          <h2 className="text-xs font-extrabold tracking-[0.16em] text-gold">LINKS</h2>
          <ul className="mt-3 space-y-2">
            {LINKS.filter((item) => {
              if (signedIn && (item.to === "/login" || item.to === "/register")) return false;
              return true;
            }).map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="text-sm font-semibold text-white/80 no-underline hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xs font-extrabold tracking-[0.16em] text-gold">SUPPORT</h2>
          <ul className="mt-3 space-y-2 text-sm text-white/80">
            <li>Desk and signal help</li>
            <li>Payment confirmation</li>
            {store?.email ? (
              <li>
                <a href={`mailto:${store.email}`} className="font-semibold text-white no-underline">
                  {store.email}
                </a>
              </li>
            ) : null}
            <li>
              {chat ? (
                <a href={chat} target="_blank" rel="noreferrer" className="font-semibold text-white no-underline">
                  Text us on WhatsApp
                </a>
              ) : (
                <span>WhatsApp support</span>
              )}
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xs font-extrabold tracking-[0.16em] text-gold">WHATSAPP</h2>
          {chat ? (
            <a
              href={chat}
              target="_blank"
              rel="noreferrer"
              aria-label="Text us on WhatsApp"
              className="wa-float mt-3 inline-flex items-center gap-3 text-white no-underline"
            >
              <WhatsAppMark />
              <span>
                <span className="block text-sm font-extrabold">WhatsApp</span>
                <span className="block text-xs text-[#8b95a7]">Text us</span>
              </span>
            </a>
          ) : (
            <div className="wa-float mt-3 inline-flex items-center gap-3 text-white/50">
              <WhatsAppMark />
              <span>
                <span className="block text-sm font-extrabold">WhatsApp</span>
                <span className="block text-xs text-[#8b95a7]">Text us</span>
              </span>
            </div>
          )}
        </section>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-[#8b95a7]">
        Casino Room · Predictions for the live desk
      </div>
        </footer>
      </div>
    </div>
  );
});

function sameStories(
  current: { name: string; place: string; text: string; stars: number }[],
  next: { name: string; place: string; text: string; stars: number }[],
) {
  if (current.length !== next.length) return false;
  return current.every(
    (row, index) =>
      row.name === next[index]?.name &&
      row.place === next[index]?.place &&
      row.text === next[index]?.text &&
      row.stars === next[index]?.stars,
  );
}

function Stars({ value }: { value: number }) {
  return (
    <p className="flex gap-0.5" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index}
          className={"text-base leading-none " + (index < value ? "star-rate text-gold" : "text-white/20")}
          style={index < value ? { animationDelay: `${index * 0.28}s` } : undefined}
        >
          ★
        </span>
      ))}
    </p>
  );
}

function WhatsAppMark() {
  return (
    <span className="grid size-14 place-items-center rounded-[18px] bg-[#25D366] shadow-[0_8px_18px_rgba(37,211,102,0.35)]">
      <svg viewBox="0 0 24 24" className="size-8" aria-hidden>
        <path
          fill="#ffffff"
          fillRule="evenodd"
          d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.5 0 .16 5.33.16 11.89c0 2.1.55 4.15 1.6 5.96L0 24l6.3-1.65a11.9 11.9 0 0 0 5.76 1.47h.01c6.55 0 11.89-5.34 11.89-11.9 0-3.18-1.24-6.16-3.44-8.44zM12.07 21.8h-.01a9.86 9.86 0 0 1-5.02-1.37l-.36-.21-3.74.98 1-3.64-.23-.37a9.84 9.84 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.98c0 5.45-4.44 9.87-9.91 9.87zm5.42-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z"
        />
      </svg>
    </span>
  );
}
