import { redirect } from "next/navigation";
import { getCurrentUser } from "../../auth";
import EmailAuthForm from "../../../components/email-auth-form";
export const dynamic = "force-dynamic";
export default async function PasswordPage() {
  if (!(await getCurrentUser())) redirect("/?auth_error=1");
  return <main className="sign-in-page"><div className="sign-in-card"><h1>Nova senha</h1><p>Escolha uma senha para voltar à sua mesa.</p><EmailAuthForm initialMode="password" /></div></main>;
}
