export const fixture = { headers: new Headers() };
export async function headers() {
  return fixture.headers;
}
export function redirect(url) {
  throw new Error(`Redirect: ${url}`);
}
