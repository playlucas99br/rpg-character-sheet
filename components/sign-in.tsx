"use client";

import { ArrowRight, BookOpen, Cloud, Dices, FlaskConical, Shield, Users } from "lucide-react";
import { Button, Die, SystemMark } from "./ui";

export default function SignIn({
  signInHref,
  onDemo,
}: {
  signInHref: string;
  onDemo: () => void;
}) {
  return (
    <main className="sign-in-page">
      <div className="sign-in-art" aria-hidden="true" />
      <header className="sign-in-brand"><Die /><span>NEXO<small>SEU UNIVERSO DE RPG</small></span></header>
      <section className="sign-in-layout">
        <div className="sign-in-story">
          <span className="eyebrow">SUA MESA. SUAS HISTÓRIAS.</span>
          <h1>A aventura continua.<br /><em>Sua ficha também.</em></h1>
          <p>Crie personagens, reúna sua mesa e deixe os dados contarem o próximo capítulo.</p>
          <div className="sign-in-systems"><SystemMark system="ordem" /><SystemMark system="jujutsu" /><span>E outros universos.</span></div>
          <div className="sign-in-features">
            <div><BookOpen size={20} /><span><strong>Fichas que acompanham você</strong>Vida, energia, sanidade e todas as suas escolhas.</span></div>
            <div><Users size={20} /><span><strong>Um espaço para cada mesa</strong>Jogadores cuidam dos personagens. O mestre acompanha a campanha.</span></div>
            <div><Dices size={20} /><span><strong>Do primeiro teste ao último golpe</strong>Role perícias, ataques e técnicas direto da ficha.</span></div>
          </div>
        </div>
        <div className="sign-in-card">
          <span className="sign-in-symbol"><Die value="20" /></span>
          <span className="eyebrow">SEU LUGAR NA MESA</span>
          <h2>Entre no seu universo.</h2>
          <p>Use sua conta do ChatGPT para entrar. Seu perfil no Nexo é criado no primeiro acesso.</p>
          <a className="button primary" href={signInHref} target="_top">Continuar com ChatGPT<ArrowRight size={17} /></a>
          <div className="sign-in-assurance"><Cloud size={16} /><span>Campanhas e fichas ficam salvas na sua conta e disponíveis quando você voltar.</span></div>
          <div className="sign-in-assurance"><Shield size={16} /><span>Suas fichas são acessíveis por você e pelo mestre da campanha.</span></div>
          <div className="sign-in-divider"><span>Conheça antes de entrar</span></div>
          <Button variant="secondary" onClick={onDemo}><FlaskConical size={16} />Explorar demonstração</Button>
          <small>A demonstração usa exemplos salvos apenas neste navegador.</small>
        </div>
      </section>
      <footer className="sign-in-footer">NEXO <span>Onde histórias se encontram.</span></footer>
    </main>
  );
}
