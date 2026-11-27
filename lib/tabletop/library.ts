import { uid, type TabletopProject } from "./model.ts";
export type LibrarySelection = { kind: "file" | "folder"; id: string };
export type LibraryClipboard = LibrarySelection & { cut: boolean };
export function descendants(project: TabletopProject, id: string): Set<string> {
  const ids = new Set([id]);
  for (let changed = true; changed;) { changed = false; for (const f of project.folders) if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) { ids.add(f.id); changed = true; } }
  return ids;
}
export function pasteLibrary(project: TabletopProject, source: LibraryClipboard, destination: string | null): TabletopProject {
  if (destination && !project.folders.some(f => f.id === destination)) return project;
  if (source.kind === "file") {
    const file = project.files.find(f => f.id === source.id); if (!file) return project;
    return { ...project, files: source.cut ? project.files.map(f => f.id === file.id ? { ...f, folderId: destination } : f) : [...project.files, { ...file, id: uid(), name: `${file.name.slice(0, 150)} (cópia)`, folderId: destination }] };
  }
  const root = project.folders.find(f => f.id === source.id); if (!root) return project;
  const branch = descendants(project, root.id);
  if (destination && branch.has(destination)) return project;
  if (source.cut) return { ...project, folders: project.folders.map(f => f.id === root.id ? { ...f, parentId: destination } : f) };
  const ids = new Map([...branch].map(id => [id, uid()]));
  return { ...project, folders: [...project.folders, ...project.folders.filter(f => branch.has(f.id)).map(f => ({ ...f, id: ids.get(f.id)!, parentId: f.id === root.id ? destination : ids.get(f.parentId!)!, name: f.id === root.id ? `${f.name.slice(0, 90)} (cópia)` : f.name }))], files: [...project.files, ...project.files.filter(f => f.folderId && branch.has(f.folderId)).map(f => ({ ...f, id: uid(), folderId: ids.get(f.folderId!)! }))] };
}
export function folderPath(project: TabletopProject, id: string | null): string {
  const names: string[] = []; const seen = new Set<string>();
  while (id && !seen.has(id)) { seen.add(id); const f = project.folders.find(f => f.id === id); if (!f) break; names.unshift(f.name); id = f.parentId; }
  return ["Arquivos", ...names].join(" / ");
}
