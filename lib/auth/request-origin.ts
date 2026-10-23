/** Next's local listener URL can differ from the Host used by the browser. */
export function isSameOrigin(request: Request) {
  const value = request.headers.get("origin");
  if (!value) return false;
  try {
    const origin = new URL(value), target = new URL(request.url);
    const host = request.headers.get("host") || target.host;
    return origin.origin === value && origin.protocol === target.protocol && origin.host === host.toLowerCase();
  } catch { return false; }
}
