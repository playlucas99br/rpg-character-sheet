export const fixture = { headers: new Headers(), cookies: [] };
export async function headers() {
  return fixture.headers;
}
export async function cookies() { return { getAll: () => fixture.cookies, set(name, value) {
  fixture.cookies = fixture.cookies.filter((cookie) => cookie.name !== name);
  if (value) fixture.cookies.push({ name, value });
} }; }
export function redirect(url) {
  throw new Error(`Redirect: ${url}`);
}
