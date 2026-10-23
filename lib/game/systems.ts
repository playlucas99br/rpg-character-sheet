import { randomId } from "./id.ts";
import type { Sheet, SystemId, ResourceKey } from "./types.ts";

export type SystemDefinition = {
  id: SystemId;
  name: string;
  short: string;
  color: string;
  icon: string;
  description: string;
  support: "ready" | "base";
  attributes: { key: string; name: string }[];
  skills: [string, string][];
  resourceLabels: Record<ResourceKey, string>;
};
const ordemAttributes = [
  { key: "FOR", name: "Força" },
  { key: "AGI", name: "Agilidade" },
  { key: "INT", name: "Intelecto" },
  { key: "PRE", name: "Presença" },
  { key: "VIG", name: "Vigor" },
];
const ordemSkills: [string, string][] = [
  ["Acrobacia", "AGI"],
  ["Adestramento", "PRE"],
  ["Artes", "PRE"],
  ["Atletismo", "FOR"],
  ["Atualidades", "INT"],
  ["Ciências", "INT"],
  ["Crime", "AGI"],
  ["Diplomacia", "PRE"],
  ["Enganação", "PRE"],
  ["Fortitude", "VIG"],
  ["Furtividade", "AGI"],
  ["Iniciativa", "AGI"],
  ["Intimidação", "PRE"],
  ["Intuição", "PRE"],
  ["Investigação", "INT"],
  ["Luta", "FOR"],
  ["Medicina", "INT"],
  ["Ocultismo", "INT"],
  ["Percepção", "PRE"],
  ["Pilotagem", "AGI"],
  ["Pontaria", "AGI"],
  ["Profissão", "INT"],
  ["Reflexos", "AGI"],
  ["Religião", "PRE"],
  ["Sobrevivência", "INT"],
  ["Tática", "INT"],
  ["Tecnologia", "INT"],
  ["Vontade", "PRE"],
];
const fantasyAttributes = [
  { key: "FOR", name: "Força" },
  { key: "DES", name: "Destreza" },
  { key: "CON", name: "Constituição" },
  { key: "INT", name: "Inteligência" },
  { key: "SAB", name: "Sabedoria" },
  { key: "CAR", name: "Carisma" },
];
export const SYSTEMS: SystemDefinition[] = [
  {
    id: "ordem",
    name: "Ordem Paranormal",
    short: "Ordem Paranormal",
    color: "#9db8ca",
    icon: "eye",
    support: "ready",
    description: "Investigação, rituais e o medo do desconhecido.",
    attributes: ordemAttributes,
    skills: ordemSkills,
    resourceLabels: { hp: "Vida", ep: "Pontos de esforço", sanity: "Sanidade" },
  },
  {
    id: "jujutsu",
    name: "Jujutsu • Ordem",
    short: "Jujutsu Kaisen",
    color: "#c3a5e3",
    icon: "flame",
    support: "ready",
    description: "Sua adaptação de Jujutsu na base de Ordem.",
    attributes: ordemAttributes,
    skills: ordemSkills,
    resourceLabels: {
      hp: "Vida",
      ep: "Energia amaldiçoada",
      sanity: "Sanidade",
    },
  },
  {
    id: "dnd",
    name: "Dungeons & Dragons",
    short: "D&D",
    color: "#d9ae7b",
    icon: "swords",
    support: "base",
    description: "Aventuras fantásticas com um modelo d20 editável.",
    attributes: fantasyAttributes,
    skills: [
      ["Acrobacia", "DES"],
      ["Arcanismo", "INT"],
      ["Atletismo", "FOR"],
      ["Furtividade", "DES"],
      ["História", "INT"],
      ["Intimidação", "CAR"],
      ["Intuição", "SAB"],
      ["Investigação", "INT"],
      ["Medicina", "SAB"],
      ["Natureza", "INT"],
      ["Percepção", "SAB"],
      ["Persuasão", "CAR"],
      ["Sobrevivência", "SAB"],
    ],
    resourceLabels: {
      hp: "Pontos de vida",
      ep: "Recurso de classe",
      sanity: "Recurso extra",
    },
  },
  {
    id: "cthulhu",
    name: "Call of Cthulhu",
    short: "Call of Cthulhu",
    color: "#87b8a6",
    icon: "tentacle",
    support: "base",
    description: "Horror cósmico e testes percentuais em d100.",
    attributes: [
      { key: "FOR", name: "Força" },
      { key: "CON", name: "Constituição" },
      { key: "TAM", name: "Tamanho" },
      { key: "DES", name: "Destreza" },
      { key: "APA", name: "Aparência" },
      { key: "INT", name: "Inteligência" },
      { key: "POD", name: "Poder" },
      { key: "EDU", name: "Educação" },
    ],
    skills: [
      ["Biblioteca", "EDU"],
      ["Encontrar", "INT"],
      ["Escutar", "INT"],
      ["Furtividade", "DES"],
      ["Luta", "FOR"],
      ["Medicina", "INT"],
      ["Ocultismo", "INT"],
      ["Psicologia", "INT"],
      ["Armas de fogo", "DES"],
    ],
    resourceLabels: {
      hp: "Pontos de vida",
      ep: "Pontos de magia",
      sanity: "Sanidade",
    },
  },
  {
    id: "tormenta",
    name: "Tormenta20",
    short: "Tormenta20",
    color: "#d78e86",
    icon: "shield",
    support: "base",
    description: "Heróis de Arton em um modelo d20 editável.",
    attributes: fantasyAttributes,
    skills: [
      ["Acrobacia", "DES"],
      ["Atletismo", "FOR"],
      ["Conhecimento", "INT"],
      ["Diplomacia", "CAR"],
      ["Fortitude", "CON"],
      ["Furtividade", "DES"],
      ["Iniciativa", "DES"],
      ["Luta", "FOR"],
      ["Misticismo", "INT"],
      ["Percepção", "SAB"],
      ["Pontaria", "DES"],
      ["Reflexos", "DES"],
      ["Vontade", "SAB"],
    ],
    resourceLabels: {
      hp: "Pontos de vida",
      ep: "Pontos de mana",
      sanity: "Recurso extra",
    },
  },
  {
    id: "custom",
    name: "Sistema personalizado",
    short: "Personalizado",
    color: "#b5b3a9",
    icon: "sparkles",
    support: "base",
    description: "Comece com d20 e escreva suas próprias regras.",
    attributes: ordemAttributes,
    skills: [
      ["Combate", "FOR"],
      ["Conhecimento", "INT"],
      ["Percepção", "PRE"],
      ["Reflexos", "AGI"],
    ],
    resourceLabels: { hp: "Vida", ep: "Energia", sanity: "Recurso extra" },
  },
];
export const systemById = (id: SystemId) =>
  SYSTEMS.find((s) => s.id === id) ?? SYSTEMS[0];
export const isOrdem = (id: SystemId) => id === "ordem" || id === "jujutsu";
export function newSheet(
  system: SystemId,
  campaignId: string,
  ownerId: string,
  ownerName: string,
  type: Sheet["type"] = "character",
): Sheet {
  const def = systemById(system);
  const attributes = Object.fromEntries(
    def.attributes.map((a) => [
      a.key,
      system === "dnd" ? 10 : system === "cthulhu" ? 50 : 1,
    ]),
  );
  return {
    id: randomId(),
    campaignId,
    ownerId,
    ownerName,
    type,
    system,
    name: type === "monster" ? "Nova criatura" : "Novo personagem",
    className: "",
    origin: "",
    level: 1,
    exposure: 5,
    defense: 10,
    attributes,
    resources: {
      hp: { current: 20, max: 20 },
      ep: { current: 10, max: 10 },
      sanity: { current: 20, max: 20 },
    },
    skills: def.skills.map(([name, attribute], i) => ({
      id: `skill-${i}`,
      name,
      attribute,
      bonus: system === "cthulhu" ? 20 : 0,
    })),
    attacks: [],
    abilities: [],
    notes: "",
    inventory: "",
    description: "",
    tone: system === "jujutsu" ? "violet" : "blue",
    version: 1,
    updatedAt: new Date().toISOString(),
  };
}
