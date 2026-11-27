import { projectSchema, type TabletopProject } from "./model.ts";

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("nexo-tabletop-v1", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("projects");
      request.result.createObjectStore("assets");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("O navegador não permitiu abrir o armazenamento da mesa."));
    request.onblocked = () => reject(new Error("Feche outras abas do Nexo para atualizar o armazenamento."));
  });
}
async function read<T>(store: string, key: string): Promise<T | undefined> {
  const db = await database();
  try { return await new Promise((resolve, reject) => {
    const request = db.transaction(store).objectStore(store).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }); } finally { db.close(); }
}
async function write(store: string, key: string, value: unknown): Promise<void> {
  const db = await database();
  try { await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(store, "readwrite");
    transaction.objectStore(store).put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error("Não foi possível salvar a mesa. Verifique o espaço disponível no navegador."));
    transaction.onabort = () => reject(new Error("O salvamento foi interrompido. Exporte uma cópia da mesa."));
  }); } finally { db.close(); }
}
export const tabletopKey = (campaignId: string, accountId: string, demo: boolean) => `${demo ? "demo" : "account"}:${accountId}:${campaignId}`;
export async function loadProject(key: string) {
  const value = await read<unknown>("projects", key);
  return value === undefined ? undefined : projectSchema.parse(value);
}
export const saveProject = (key: string, project: TabletopProject) => write("projects", key, projectSchema.parse(project));
export const saveAsset = (key: string, id: string, blob: Blob) => write("assets", `${key}:${id}`, blob);
export const loadAsset = (key: string, id: string) => read<Blob>("assets", `${key}:${id}`);
export function referencedAssets(project: TabletopProject): string[] {
  return [...new Set([...(project.files ?? []).map(f => f.asset), ...project.scenes.flatMap(s => [s.map, ...(s.cutscenes ?? []).map(c => c.asset), ...(s.items ?? []).map(i => i.asset), ...s.tokens.flatMap(t => t.variants.map(v => v.asset))])].filter((id): id is string => Boolean(id)))];
}
