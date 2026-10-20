/** Retrying may succeed (timeouts, 429, 5xx). */
export class TransientIntegrationError extends Error {
  readonly transient = true;
}

/** Retrying will not help (bad request, auth failure, missing configuration). */
export class PermanentIntegrationError extends Error {
  readonly transient = false;
}

export class NotConfiguredError extends PermanentIntegrationError {
  constructor(what: string) {
    super(`${what} is not configured. Set the provider and credentials in the environment (see docs/integrations.md).`);
  }
}

export function isTransient(err: unknown): boolean {
  return err instanceof TransientIntegrationError;
}

/** Fetch with a hard timeout; classifies HTTP failures as transient or permanent. */
export async function fetchWithTimeout(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = 10_000, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(url, { ...rest, signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    throw new TransientIntegrationError(`Request failed: ${(err as Error).name}`);
  }
  if (res.ok) return res;
  if (res.status === 429 || res.status >= 500) throw new TransientIntegrationError(`Provider responded ${res.status}`);
  throw new PermanentIntegrationError(`Provider responded ${res.status}`);
}

/** Exponential backoff with jitter: ~1m, 2m, 4m, 8m ... capped at 1h. */
export function nextAttemptDelayMs(attempt: number, random = Math.random): number {
  const base = Math.min(60_000 * 2 ** Math.max(0, attempt - 1), 3_600_000);
  return Math.round(base * (0.8 + random() * 0.4));
}

/** Keeps logs free of secrets and long personal data. */
export function safeErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return msg
    .replace(/(key|token|secret|authorization|password)=?[:\s]*[^\s,;]+/gi, "$1=[redacted]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]")
    .slice(0, 500);
}
