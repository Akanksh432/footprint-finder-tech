import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Navbar, Footer } from "@/components/site-chrome";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Notebook as NotebookIcon, Trash2, Tag, Search, FileText, Save } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/notebook")({
  head: () => ({ meta: [{ title: "Investigation Notebook — CyberOracle" }] }),
  component: NotebookPage,
});

interface Investigation {
  id: string;
  name: string;
  description: string | null;
  target_summary: string | null;
  status: string;
  created_at: string;
}

interface Note {
  id: string;
  investigation_id: string;
  title: string | null;
  content: string;
  note_type: string;
  tags: string[];
  source_scan_id: string | null;
  created_at: string;
}

function NotebookPage() {
  const { user } = useAuth();
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState("");
  const [newDialog, setNewDialog] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);

  const loadInvestigations = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("investigations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    setInvestigations(data ?? []);
    if (!activeId && data && data.length > 0) setActiveId(data[0].id);
  };

  const loadNotes = async (invId: string) => {
    const { data, error } = await supabase
      .from("investigation_notes")
      .select("*")
      .eq("investigation_id", invId)
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    setNotes((data ?? []) as Note[]);
  };

  useEffect(() => { loadInvestigations(); }, [user?.id]);
  useEffect(() => { if (activeId) loadNotes(activeId); else setNotes([]); }, [activeId]);

  const filtered = useMemo(
    () => investigations.filter((i) => !search.trim() || i.name.toLowerCase().includes(search.toLowerCase())),
    [investigations, search],
  );
  const active = investigations.find((i) => i.id === activeId) ?? null;

  const createInvestigation = async (name: string, description: string, target: string) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("investigations")
      .insert({ user_id: user.id, name, description, target_summary: target })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setInvestigations((s) => [data as Investigation, ...s]);
    setActiveId(data.id);
    setNewDialog(false);
    toast.success("Investigation created");
  };

  const addNote = async () => {
    if (!user || !activeId) return;
    const { data, error } = await supabase
      .from("investigation_notes")
      .insert({
        investigation_id: activeId,
        user_id: user.id,
        title: "New note",
        content: "",
        note_type: "manual",
      })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setNotes((s) => [data as Note, ...s]);
    setEditing(data as Note);
  };

  const saveNote = async (n: Note) => {
    const { error } = await supabase
      .from("investigation_notes")
      .update({ title: n.title, content: n.content, tags: n.tags })
      .eq("id", n.id);
    if (error) { toast.error(error.message); return; }
    setNotes((s) => s.map((x) => (x.id === n.id ? n : x)));
    toast.success("Note saved");
  };

  const deleteNote = async (id: string) => {
    const { error } = await supabase.from("investigation_notes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setNotes((s) => s.filter((x) => x.id !== id));
    setEditing(null);
  };

  return (
    <div className="min-h-screen flex flex-col relative z-10">
      <Navbar />
      <main className="flex-1 mx-auto max-w-7xl w-full px-5 sm:px-8 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-8">
          <div>
            <div className="text-xs uppercase tracking-widest text-neon">Notebook</div>
            <h1 className="font-display mt-2 text-4xl font-bold tracking-tight">Investigations</h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-xl">
              Organize OSINT findings into named investigations. Import notes from past scans.
            </p>
          </div>
          <button
            onClick={() => setNewDialog(true)}
            className="inline-flex items-center gap-2 min-h-11 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 glow-teal"
          >
            <Plus className="h-4 w-4" /> New investigation
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
          {/* Sidebar */}
          <aside className="rounded-2xl bg-card border border-border p-4">
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter…"
                className="w-full min-h-10 pl-8 pr-3 rounded-lg bg-input border border-border focus:border-neon/50 outline-none text-sm"
              />
            </div>
            {filtered.length === 0 ? (
              <div className="text-xs text-muted-foreground p-3">No investigations.</div>
            ) : (
              <div className="space-y-1">
                {filtered.map((inv) => (
                  <button
                    key={inv.id}
                    onClick={() => setActiveId(inv.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm border-l-2 transition-colors ${
                      activeId === inv.id ? "bg-surface border-neon" : "border-transparent hover:bg-surface/60"
                    }`}
                  >
                    <div className="font-medium truncate">{inv.name}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        inv.status === "active" ? "bg-success" :
                        inv.status === "complete" ? "bg-muted-foreground" : "bg-warning"
                      }`} />
                      {inv.status} · {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true })}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </aside>

          {/* Main */}
          <section>
            {!active ? (
              <div className="rounded-2xl bg-card border border-border p-12 text-center">
                <NotebookIcon className="h-10 w-10 mx-auto text-neon mb-3 animate-float" />
                <h3 className="font-display text-xl font-semibold">No investigation selected</h3>
                <p className="mt-2 text-sm text-muted-foreground">Create your first investigation to start collecting notes.</p>
                <button
                  onClick={() => setNewDialog(true)}
                  className="mt-5 inline-flex items-center gap-2 min-h-11 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" /> Create investigation
                </button>
              </div>
            ) : (
              <>
                <div className="rounded-2xl bg-card border border-border p-5 mb-5">
                  <h2 className="font-display text-2xl font-bold">{active.name}</h2>
                  {active.description && <p className="text-sm text-muted-foreground mt-1">{active.description}</p>}
                  {active.target_summary && (
                    <div className="mt-3 text-xs text-muted-foreground">
                      <span className="text-neon uppercase tracking-widest">Target:</span> {active.target_summary}
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {notes.map((n, idx) => (
                    <button
                      key={n.id}
                      onClick={() => setEditing(n)}
                      style={{ animationDelay: `${idx * 0.05}s` }}
                      className="text-left rounded-2xl bg-card border border-border p-4 card-hover animate-fade-up"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium truncate">{n.title || "Untitled"}</div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ring-1 ${
                          n.note_type === "imported" ? "bg-success/10 text-success ring-success/30" :
                          n.note_type === "highlight" ? "bg-warning/10 text-warning ring-warning/30" :
                          "bg-primary/10 text-neon ring-primary/30"
                        }`}>{n.note_type}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1.5 line-clamp-3">
                        {n.content || <em>Empty note</em>}
                      </div>
                      {n.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {n.tags.slice(0, 4).map((t) => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-surface ring-1 ring-border text-muted-foreground">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={addNote}
                    className="rounded-2xl border-2 border-dashed border-border hover:border-neon/40 p-4 min-h-32 flex flex-col items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="h-5 w-5 mb-1" />
                    <span className="text-sm">Add note</span>
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
      <Footer />

      {newDialog && <NewInvestigationDialog onClose={() => setNewDialog(false)} onCreate={createInvestigation} />}
      {editing && (
        <NoteEditorDrawer
          note={editing}
          onClose={() => setEditing(null)}
          onSave={saveNote}
          onDelete={deleteNote}
        />
      )}
    </div>
  );
}

function NewInvestigationDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (n: string, d: string, t: string) => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [target, setTarget] = useState("");
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6">
        <h3 className="font-display text-xl font-semibold">New investigation</h3>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Name *</span>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full min-h-11 px-3 rounded-lg bg-input border border-border focus:border-neon/50 outline-none text-sm" />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Description</span>
            <input value={desc} onChange={(e) => setDesc(e.target.value)}
              className="mt-1.5 w-full min-h-11 px-3 rounded-lg bg-input border border-border focus:border-neon/50 outline-none text-sm" />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Target summary</span>
            <textarea value={target} onChange={(e) => setTarget(e.target.value)} rows={3}
              className="mt-1.5 w-full px-3 py-2 rounded-lg bg-input border border-border focus:border-neon/50 outline-none text-sm resize-none" />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="min-h-11 px-4 rounded-lg bg-surface border border-border text-sm">Cancel</button>
          <button
            disabled={!name.trim()}
            onClick={() => onCreate(name.trim(), desc.trim(), target.trim())}
            className="min-h-11 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >Create</button>
        </div>
      </div>
    </div>
  );
}

function NoteEditorDrawer({
  note, onClose, onSave, onDelete,
}: {
  note: Note;
  onClose: () => void;
  onSave: (n: Note) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState<Note>(note);
  const [tagInput, setTagInput] = useState("");
  useEffect(() => setDraft(note), [note.id]);

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (!draft.tags.includes(t)) setDraft({ ...draft, tags: [...draft.tags, t] });
    setTagInput("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex justify-end" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="h-full w-full max-w-lg bg-card border-l border-border flex flex-col">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest text-neon">Edit note</div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm">Close</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Title</span>
            <input value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="mt-1.5 w-full min-h-11 px-3 rounded-lg bg-input border border-border focus:border-neon/50 outline-none text-sm" />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Content (markdown)</span>
            <textarea
              value={draft.content}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              rows={14}
              className="mt-1.5 w-full px-3 py-2 rounded-lg bg-input border border-border focus:border-neon/50 outline-none text-sm font-mono resize-y"
            />
          </label>
          <div>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Tags</span>
            <div className="mt-1.5 flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="Add tag + Enter"
                className="flex-1 min-h-10 px-3 rounded-lg bg-input border border-border focus:border-neon/50 outline-none text-sm"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {draft.tags.map((t) => (
                <button key={t} onClick={() => setDraft({ ...draft, tags: draft.tags.filter((x) => x !== t) })}
                  className="text-xs px-2 py-0.5 rounded-full bg-primary/15 ring-1 ring-primary/30 text-neon hover:bg-danger/10 hover:text-danger hover:ring-danger/30">
                  #{t} ×
                </button>
              ))}
            </div>
          </div>
          {draft.source_scan_id && (
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3 w-3" /> Imported from scan
            </div>
          )}
        </div>
        <div className="p-5 border-t border-border flex items-center justify-between gap-2">
          <button
            onClick={() => onDelete(draft.id)}
            className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-lg bg-surface border border-border hover:border-danger/40 hover:text-danger text-sm"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
          <button
            onClick={() => onSave(draft)}
            className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            <Save className="h-3.5 w-3.5" /> Save
          </button>
        </div>
      </div>
    </div>
  );
}
