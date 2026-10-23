export const dynamic = "force-dynamic";
export default function SignOutPage() {
  return <main className="sign-in-page"><div className="sign-in-card"><h1>Sair da conta?</h1><p>Suas fichas e campanhas continuarão salvas.</p><form action="/api/auth" method="post"><input type="hidden" name="action" value="signout" /><button className="button primary" type="submit">Sair da conta</button></form><a className="auth-link" href="/">Voltar à mesa</a></div></main>;
}
