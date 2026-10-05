const DEFAULT_WAIT_MS = 2 * 60 * 1000;
const NO_WAIT_EMAILS = new Set(["betboro001@gmail.com"]);

// Only shortens the loading screen shown after an admin has confirmed the payment.
export function getNetworkWaitMs(email?: string | null) {
  return email && NO_WAIT_EMAILS.has(email.trim().toLowerCase()) ? 0 : DEFAULT_WAIT_MS;
}
