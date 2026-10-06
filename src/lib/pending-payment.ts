const KEY = "aviator-pending-payment";

export function savePendingPayment(id: string, amount: number) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ id, amount }));
  } catch {
    // storage unavailable; the popup just won't survive a reload
  }
}

export function loadPendingPayment(): { id: string; amount: number } | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: unknown; amount?: unknown };
    if (typeof parsed.id !== "string" || typeof parsed.amount !== "number") return null;
    return { id: parsed.id, amount: parsed.amount };
  } catch {
    return null;
  }
}

export function clearPendingPayment() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
