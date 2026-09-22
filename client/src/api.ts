let csrf = "";
export function setCsrf(token: string) {
  csrf = token;
}
export async function api<T = any>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response
    .json()
    .catch(() => ({ error: "The server could not complete this request." }));
  if (
    response.status === 401 &&
    !path.startsWith("/auth/") &&
    path !== "/bootstrap"
  )
    window.dispatchEvent(new Event("pactshift-session-expired"));
  if (!response.ok)
    throw new Error(result.error || `Request failed (${response.status})`);
  if (result.csrfToken) setCsrf(result.csrfToken);
  return result;
}
export function money(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: cents % 100 ? 2 : 0,
  }).format(cents / 100);
}
export function date(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
export function download(name: string, data: unknown) {
  const blob = new Blob(
    [typeof data === "string" ? data : JSON.stringify(data, null, 2)],
    { type: typeof data === "string" ? "text/plain" : "application/json" },
  );
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
