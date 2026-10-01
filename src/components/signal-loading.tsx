import { Plane } from "lucide-react";

export function SignalLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 px-6" role="status">
      <div className="grid justify-items-center gap-5">
        <div className="relative grid size-28 place-items-center">
          <span className="signal-ping absolute inset-0 rounded-full border-2 border-red" />
          <span className="signal-ping absolute inset-4 rounded-full border border-gold [animation-delay:500ms]" />
          <span className="signal-orbit absolute inset-1">
            <Plane className="absolute top-0 left-1/2 size-6 -translate-x-1/2 text-red" aria-hidden />
          </span>
          <span className="size-3 rounded-full bg-gold" />
        </div>
        <p className="text-center text-sm font-extrabold tracking-[0.2em] text-gold uppercase">{label}</p>
      </div>
    </div>
  );
}
