import { newSheet } from "./systems";
import type { Sheet, Workspace } from "./types";

const date = "2026-10-23T12:00:00.000Z";
function character(
  id: string,
  campaignId: string,
  system: Sheet["system"],
  name: string,
  ownerId: string,
  ownerName: string,
  className: string,
  tone: string,
): Sheet {
  const s = {
    ...newSheet(system, campaignId, ownerId, ownerName),
    id,
    name,
    className,
    tone,
    updatedAt: date,
    level: 3,
    exposure: 15,
  };
  s.attributes = { FOR: 2, AGI: 3, INT: 2, PRE: 1, VIG: 2 };
  s.resources = {
    hp: { current: 32, max: 45 },
    ep: { current: 16, max: 24 },
    sanity: { current: 28, max: 35 },
  };
  s.defense = 16;
  s.skills = s.skills.map((k) => ({
    ...k,
    bonus: [
      "Luta",
      "Pontaria",
      "Reflexos",
      "Percepção",
      "Investigação",
      "Ocultismo",
    ].includes(k.name)
      ? 5
      : 0,
  }));
  const skill = s.skills.find(
    (k) => k.name === (system === "jujutsu" ? "Luta" : "Pontaria"),
  )!;
  s.attacks = [
    {
      id: "attack-1",
      name: system === "jujutsu" ? "Lâmina ritualística" : "Pistola tática",
      skillId: skill.id,
      damage: system === "jujutsu" ? "2d8+2" : "2d6",
      range: system === "jujutsu" ? "Corpo a corpo" : "Curto",
      critical: 20,
      description:
        system === "jujutsu"
          ? "Uma lâmina envolta em energia amaldiçoada."
          : "Discreta, confiável e sempre à mão.",
    },
  ];
  s.abilities = [
    {
      id: "ability-1",
      name: system === "jujutsu" ? "Pulso amaldiçoado" : "Disparo concentrado",
      cost: 2,
      formula: "2d6+3",
      description:
        "Concentre sua energia em um único golpe. Personalize esta habilidade de acordo com as regras da sua mesa.",
    },
  ];
  s.inventory =
    "Kit de primeiros socorros\nLanterna\nCorda (10 m)\nAmuleto de família";
  s.notes =
    "Há coisas que só se revelam quando as luzes se apagam.\n\nObjetivo: descobrir o que aconteceu no santuário antes da próxima lua nova.";
  s.description =
    "Entre o mundo que conhecemos e aquilo que não conseguimos explicar, alguém precisa dar o primeiro passo.";
  return s;
}
export function createDemo(): Workspace {
  const kaori = character(
    "demo-kaori",
    "demo-heian",
    "jujutsu",
    "Kaori Sato",
    "demo-me",
    "Você",
    "Feiticeira • Técnica das sombras",
    "violet",
  );
  const takeshi = character(
    "demo-takeshi",
    "demo-heian",
    "jujutsu",
    "Takeshi Mori",
    "demo-rafa",
    "Rafael",
    "Feiticeiro • Combatente",
    "amber",
  );
  const dante = character(
    "demo-dante",
    "demo-aurora",
    "ordem",
    "Dante Azevedo",
    "demo-me",
    "Você",
    "Especialista • Atirador de elite",
    "blue",
  );
  const helena = character(
    "demo-helena",
    "demo-aurora",
    "ordem",
    "Helena Vilar",
    "demo-bia",
    "Bia",
    "Ocultista • Graduada",
    "rose",
  );
  const monster = {
    ...character(
      "demo-monster",
      "demo-heian",
      "jujutsu",
      "O Devorador de Ecos",
      "demo-me",
      "Você",
      "Maldição de 2º grau",
      "rose",
    ),
    type: "monster" as const,
    defense: 21,
    resources: {
      hp: { current: 120, max: 120 },
      ep: { current: 40, max: 40 },
      sanity: { current: 1, max: 1 },
    },
  };
  return {
    campaigns: [
      {
        id: "demo-heian",
        name: "Ecos da Era Heian",
        system: "jujutsu",
        description:
          "Sob um céu sem estrelas, antigas maldições voltam a despertar. O destino de um clã está em suas mãos.",
        banner: "shrine",
        status: "active",
        role: "gm",
        gmName: "Você",
        createdAt: date,
        inviteCode: "DEMONSTRACAO-HEIAN",
        members: [
          { id: "demo-me", name: "Você", role: "gm" },
          { id: "demo-rafa", name: "Rafael", role: "player" },
          { id: "demo-ana", name: "Ana", role: "player" },
        ],
      },
      {
        id: "demo-aurora",
        name: "O silêncio de Santa Aurora",
        system: "ordem",
        description:
          "Uma cidade pequena. Um desaparecimento. E uma verdade que deveria continuar enterrada.",
        banner: "forest",
        status: "active",
        role: "gm",
        gmName: "Você",
        createdAt: date,
        inviteCode: "DEMONSTRACAO-AURORA",
        members: [
          { id: "demo-me", name: "Você", role: "gm" },
          { id: "demo-bia", name: "Bia", role: "player" },
          { id: "demo-leo", name: "Leo", role: "player" },
        ],
      },
    ],
    sheets: [kaori, dante, takeshi, helena, monster],
    rolls: [
      {
        id: "demo-roll-1",
        campaignId: "demo-aurora",
        sheetId: dante.id,
        userId: "demo-me",
        userName: "Você",
        characterName: dante.name,
        label: "Investigação",
        formula: "2d20kh1+5",
        dice: [8, 17],
        selected: 17,
        bonus: 5,
        total: 22,
        critical: false,
        fumble: false,
        mode: "highest",
        visibility: "table",
        createdAt: date,
      },
      {
        id: "demo-roll-2",
        campaignId: "demo-heian",
        sheetId: kaori.id,
        userId: "demo-me",
        userName: "Você",
        characterName: kaori.name,
        label: "Lâmina ritualística • acerto",
        formula: "2d20kh1+5",
        dice: [12, 20],
        selected: 20,
        bonus: 5,
        total: 25,
        critical: true,
        fumble: false,
        mode: "highest",
        visibility: "table",
        createdAt: date,
      },
    ],
  };
}
