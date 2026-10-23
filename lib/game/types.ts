export type SystemId =
  | "ordem"
  | "jujutsu"
  | "dnd"
  | "cthulhu"
  | "tormenta"
  | "custom";
export type ResourceKey = "hp" | "ep" | "sanity";
export type Resource = { current: number; max: number };
export type Skill = {
  id: string;
  name: string;
  attribute: string;
  bonus: number;
};
export type Attack = {
  id: string;
  name: string;
  skillId: string;
  damage: string;
  range: string;
  critical: number;
  description: string;
};
export type Ability = {
  id: string;
  name: string;
  cost: number;
  formula: string;
  description: string;
};
export type KnownRitual = {
  id: string;
  name: string;
  element: "Conhecimento" | "Energia" | "Morte" | "Sangue" | "Medo";
  circle: number;
  summary: string;
  sourcePage: number;
  details?: RitualDetails;
};
export type RitualDetails = {
  execution?: string;
  range?: string;
  target?: string;
  area?: string;
  effect?: string;
  duration?: string;
  resistance?: string;
  description: string[];
};
export type KnownWeapon = {
  id: string;
  name: string;
  category: string;
  damage: string;
  range: string;
  critical: number;
  criticalDetail?: string;
  damageType?: string;
  slots?: number;
  sourcePage: number;
  description?: string;
};
export type Sheet = {
  id: string;
  campaignId: string;
  ownerId: string;
  ownerName: string;
  type: "character" | "monster";
  system: SystemId;
  name: string;
  className: string;
  origin: string;
  level: number;
  exposure: number;
  defense: number;
  attributes: Record<string, number>;
  resources: Record<ResourceKey, Resource>;
  skills: Skill[];
  attacks: Attack[];
  rituals: KnownRitual[];
  abilities: Ability[];
  inventory: string;
  notes: string;
  description: string;
  tone: string;
  version: number;
  updatedAt: string;
};
export type Member = { id: string; name: string; role: "gm" | "player" };
export type Campaign = {
  id: string;
  name: string;
  description: string;
  system: SystemId;
  banner: string;
  status: "active" | "paused";
  role: "gm" | "player";
  gmName: string;
  members: Member[];
  inviteCode?: string;
  createdAt: string;
};
export type Roll = {
  id: string;
  campaignId: string;
  sheetId?: string;
  userId: string;
  userName: string;
  characterName: string;
  label: string;
  formula: string;
  dice: number[];
  selected: number;
  bonus: number;
  total: number;
  critical: boolean;
  fumble: boolean;
  mode: "sum" | "highest" | "lowest" | "percentile";
  target?: number;
  success?: boolean;
  visibility: "table" | "gm";
  createdAt: string;
};
export type Workspace = {
  campaigns: Campaign[];
  sheets: Sheet[];
  rolls: Roll[];
};
export type User = { id: string; name: string };
export type RollRequest =
  | { kind: "manual"; formula: string; label?: string }
  | { kind: "skill"; id: string }
  | { kind: "attribute"; id: string }
  | { kind: "attack"; id: string; damage?: boolean }
  | { kind: "ability"; id: string };
