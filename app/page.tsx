import {
  getChatGPTUser,
  chatGPTSignInPath,
  chatGPTSignOutPath,
} from "./chatgpt-auth";
import NexoApp from "../components/nexo-app";
export const dynamic = "force-dynamic";
export default async function Home() {
  const user = await getChatGPTUser();
  return (
    <NexoApp
      initialUser={
        user
          ? { id: user.userId, name: user.fullName || user.email.split("@")[0] }
          : null
      }
      signInHref={chatGPTSignInPath("/")}
      signOutHref={chatGPTSignOutPath("/")}
    />
  );
}
