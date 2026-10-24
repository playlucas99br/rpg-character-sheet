import {
  getCurrentUser, authProvider, signInPath, signOutPath,
} from "./auth";
import NexoApp from "../components/nexo-app";
export const dynamic = "force-dynamic";
export default async function Home({ searchParams }: { searchParams?: Promise<{ demo?: string | string[] }> }) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams ?? Promise.resolve({ demo: undefined })]);
  return (
    <NexoApp
      initialDemo={!user && params.demo === "1"}
      initialUser={
        user
          ? { id: user.userId, name: user.fullName || user.email.split("@")[0] }
          : null
      }
      authProvider={authProvider()}
      signInHref={signInPath("/")}
      signOutHref={signOutPath()}
    />
  );
}
