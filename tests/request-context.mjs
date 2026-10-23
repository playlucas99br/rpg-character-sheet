export const fixture = { headers: new Headers() };
export async function headers() {
  return fixture.headers;
}
export async function cookies() { return { getAll: () => [], set() { throw new Error("Read-only request"); } }; }
export function redirect(url) {
  throw new Error(`Redirect: ${url}`);
}
