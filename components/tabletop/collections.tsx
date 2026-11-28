"use client";
import { useState, type DragEvent, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Folder, FolderPlus, Pencil, Search, Trash2, X } from "lucide-react";
import { DRAG_MIME, uid } from "../../lib/tabletop/model";
type Group = { id: string; name: string };
export function CollectionSelect({ groups, value, label, onChange }: { groups: Group[]; value: string | null; label: string; onChange: (id: string | null) => void }) {
  return <label className="vtt-field"><span>{label}</span><select value={value ?? ""} onChange={e => onChange(e.target.value || null)}><option value="">Sem conjunto</option>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>;
}
export default function Collections<T extends { id: string; name: string; groupId: string | null }>({ label, groups, items, onGroups, onRemoveGroup, onMove, render }: { label: string; groups: Group[]; items: T[]; onGroups: (groups: Group[]) => void; onRemoveGroup: (id: string) => void; onMove: (id: string, groupId: string | null) => void; render: (item: T) => ReactNode }) {
  const [search, setSearch] = useState(""), [creating, setCreating] = useState(false), [name, setName] = useState("");
  const [expanded, setExpanded] = useState<string[]>([""]), [editing, setEditing] = useState<string | null>(null), [hover, setHover] = useState<string | null>(null);
  const query = search.trim().toLocaleLowerCase("pt-BR");
  const ordered = [...groups].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const matches = (item: T, group: Group) => !query || `${item.name} ${group.name}`.toLocaleLowerCase("pt-BR").includes(query);
  const roots = [{ id: "", name: "Sem conjunto" }, ...ordered];
  function accept(e: DragEvent, groupId: string) {
    e.preventDefault(); setHover(null);
    try { const data = JSON.parse(e.dataTransfer.getData(DRAG_MIME)); if (data.kind === (label === "cenas" ? "scene" : "token") && items.some(item => item.id === data.id)) onMove(data.id, groupId || null); } catch { /* Ignore foreign drags. */ }
  }
  return <div className="vtt-collections">
    <div className="vtt-collection-toolbar"><label className="vtt-library-search"><Search size={15} /><input aria-label={`Buscar ${label}`} placeholder={`Buscar ${label}…`} value={search} onChange={e => setSearch(e.target.value)} />{search && <button type="button" aria-label="Limpar busca" onClick={() => setSearch("")}><X size={14} /></button>}</label><button className="vtt-icon" title="Criar conjunto" aria-label="Novo conjunto" disabled={groups.length >= 100} onClick={() => setCreating(v => !v)}><FolderPlus size={18} /></button></div>
    {creating && <form className="vtt-collection-create" onSubmit={e => { e.preventDefault(); if (!name.trim()) return; const id = uid(); onGroups([...groups, { id, name: name.trim() }]); setExpanded(ids => [...ids, id]); setName(""); setCreating(false); }}><input autoFocus aria-label={`Nome do conjunto de ${label}`} maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="Nome do conjunto" /><button className="vtt-primary" disabled={!name.trim()}>Criar</button></form>}
    <p className="vtt-collection-hint">{items.length} {label} · arraste para organizar</p>
    {roots.map(g => {
      const children = items.filter(i => (g.id ? i.groupId === g.id : !i.groupId || !groups.some(group => group.id === i.groupId)) && matches(i, g)).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
      if (query && !children.length) return null;
      const open = !!query || expanded.includes(g.id);
      return <section key={g.id} className={`vtt-collection ${hover === g.id ? "is-drop-target" : ""}`} onDragOver={e => { if (e.dataTransfer.types.includes(DRAG_MIME)) { e.preventDefault(); setHover(g.id); } }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setHover(null); }} onDrop={e => accept(e, g.id)}>
        <div className="vtt-collection-head"><button className="vtt-collection-toggle" aria-expanded={open} onClick={() => setExpanded(ids => ids.includes(g.id) ? ids.filter(i => i !== g.id) : [...ids, g.id])}>{open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}<Folder size={16} /><span>{g.name}</span><small>{children.length}</small></button>{g.id && <button className="vtt-icon" aria-label={`Editar conjunto ${g.name}`} title="Editar conjunto" onClick={() => { setEditing(editing === g.id ? null : g.id); setExpanded(ids => ids.includes(g.id) ? ids : [...ids, g.id]); }}><Pencil size={14} /></button>}</div>
        {g.id && editing === g.id && <div className="vtt-collection-settings"><input aria-label={`Renomear conjunto ${g.name}`} maxLength={100} defaultValue={g.name} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} onBlur={e => { const next = e.target.value.trim(); if (next && next !== g.name) onGroups(groups.map(group => group.id === g.id ? { ...group, name: next } : group)); else e.target.value = g.name; }} /><button className="vtt-icon" title="Desagrupar sem remover os itens" aria-label={`Desagrupar ${g.name}`} onClick={() => { onRemoveGroup(g.id); setEditing(null); }}><Trash2 size={14} /></button></div>}
        {open && <div className="vtt-collection-items">{children.map(item => <div key={item.id}>{render(item)}</div>)}{!children.length && <p className="vtt-caption">Arraste itens para este conjunto.</p>}</div>}
      </section>;
    })}
    {query && !roots.some(g => items.some(i => (g.id ? i.groupId === g.id : !i.groupId) && matches(i, g))) && <p className="vtt-caption">Nenhum resultado para “{search}”.</p>}
  </div>;
}
