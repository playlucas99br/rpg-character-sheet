"use client";
import { ArrowRight, BookOpen, Compass, Crown, Dices, History, Plus, Skull, Users } from "lucide-react";
import type { Campaign, Sheet } from "../lib/game/types";
import { Portrait, SystemMark } from "./ui";

export default function DashboardResume({
  campaign, sheet, sheetCampaign, campaignVisited, sheetVisited,
  onCampaign, onSheet, onCreateSheet, onDice, onHistory,
}: {
  campaign: Campaign;
  sheet?: Sheet;
  sheetCampaign?: Campaign;
  campaignVisited: boolean;
  sheetVisited: boolean;
  onCampaign: () => void;
  onSheet: () => void;
  onCreateSheet: (type: Sheet["type"]) => void;
  onDice: () => void;
  onHistory: () => void;
}) {
  return (
    <section className="resume-panel" aria-labelledby="resume-title">
      <div className="resume-heading">
        <div>
          <span className="eyebrow"><Compass size={15} /> SUA MESA ESTÁ AQUI</span>
          <h2 id="resume-title">{campaignVisited || sheetVisited ? "Continue de onde parou." : "Tudo pronto para o próximo capítulo."}</h2>
          <p>Abra sua mesa, encontre sua ficha e deixe a história continuar.</p>
        </div>
        <span className="resume-device-note">Últimos acessos neste navegador</span>
      </div>
      <div className="resume-grid">
        <button type="button" className="resume-card resume-campaign" onClick={onCampaign} aria-label={`Abrir campanha ${campaign.name}`}>
          <span className="resume-card-label">{campaignVisited ? "ÚLTIMA CAMPANHA" : "CAMPANHA PARA CONTINUAR"}</span>
          <SystemMark system={campaign.system} />
          <strong className="resume-card-title">{campaign.name}</strong>
          <span className="resume-card-meta">
            {campaign.role === "gm" ? <Crown size={15} /> : <Users size={15} />}
            {campaign.role === "gm" ? "Você é o mestre" : "Você é jogador"}
            <span aria-hidden="true">·</span>
            {campaign.status === "paused" ? "Pausada" : "Em andamento"}
          </span>
          <span className="resume-card-action">Abrir campanha <ArrowRight size={18} /></span>
        </button>
        {sheet ? (
          <button type="button" className="resume-card resume-sheet" onClick={onSheet} aria-label={`Abrir ficha ${sheet.name}`}>
            <span className="resume-card-label">{sheetVisited ? "ÚLTIMA FICHA" : "FICHA PARA CONTINUAR"}</span>
            <div className="resume-sheet-identity">
              <Portrait sheet={sheet} size="small" />
              <div>
                <strong className="resume-card-title">{sheet.name}</strong>
                <span className="resume-card-meta">{sheet.type === "monster" ? "Criatura" : "Personagem"} · {sheetCampaign?.name}</span>
              </div>
            </div>
            <span className="resume-vitals"><span className="resume-hp">{sheet.resources.hp.current}<small> / {sheet.resources.hp.max} PV</small></span><span>{sheet.className || "Ficha pronta para jogar"}</span></span>
            <span className="resume-card-action">Abrir ficha <ArrowRight size={18} /></span>
          </button>
        ) : (
          <button type="button" className="resume-card resume-empty" onClick={() => onCreateSheet("character")}>
            <span className="resume-card-label">SEU PRÓXIMO PERSONAGEM</span>
            <BookOpen size={28} />
            <strong className="resume-card-title">Sua história começa com um nome.</strong>
            <span className="resume-card-meta">Crie uma ficha para a sua mesa.</span>
            <span className="resume-card-action">Criar personagem <Plus size={18} /></span>
          </button>
        )}
      </div>
      <div className="resume-shortcuts" role="group" aria-label={`Atalhos da campanha ${campaign.name}`}>
        <button type="button" onClick={onDice}><Dices size={18} />Rolar dados</button>
        <button type="button" onClick={() => onCreateSheet("character")}><Plus size={18} />Novo personagem</button>
        <button type="button" onClick={onHistory}><History size={18} />Histórico da mesa</button>
        {campaign.role === "gm" && <button type="button" onClick={() => onCreateSheet("monster")}><Skull size={18} />Nova criatura</button>}
      </div>
    </section>
  );
}
