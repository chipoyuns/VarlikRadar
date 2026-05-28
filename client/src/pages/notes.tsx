import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Note } from "@shared/schema";
import {
  BookOpen, Plus, Search, Filter, SortAsc, Star, Archive, Trash2,
  Pencil, X, ChevronLeft, Save, Tag, Pin, Hash, BarChart2,
  Bold, Italic, Underline, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare, Link, Code, Quote, Minus, Undo, Redo,
  Eye, FileText, Copy, Download,
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";

// ─── Constants ───────────────────────────────────────────────────────────────
const NOTE_CATEGORIES = [
  { value: "investment", label: "💰 Yatırım",  color: "#00D4AA" },
  { value: "analysis",   label: "📊 Analiz",   color: "#4B9EFF" },
  { value: "stock",      label: "📈 Hisse",    color: "#FFB833" },
  { value: "crypto",     label: "₿ Kripto",    color: "#FF6B35" },
  { value: "budget",     label: "💼 Bütçe",    color: "#A78BFA" },
  { value: "goal",       label: "🎯 Hedef",    color: "#22C55E" },
  { value: "idea",       label: "💡 Fikir",    color: "#F59E0B" },
  { value: "other",      label: "📝 Diğer",    color: "#8892A4" },
];

const MOOD_OPTIONS = [
  { value: "optimistic",  label: "😊 İyimser",  color: "#00D4AA" },
  { value: "worried",     label: "😰 Endişeli", color: "#FF4757" },
  { value: "determined",  label: "😤 Kararlı",  color: "#4B9EFF" },
  { value: "uncertain",   label: "🤔 Kararsız", color: "#FFB833" },
  { value: "calm",        label: "😎 Sakin",    color: "#A78BFA" },
  { value: "excited",     label: "🤩 Heyecanlı",color: "#FF6B9D" },
  { value: "fearful",     label: "😨 Korku",    color: "#FF4757" },
  { value: "greedy",      label: "🤑 Açgözlü", color: "#FFB833" },
];

const SORT_OPTIONS = [
  { value: "date_desc",    label: "En Yeni" },
  { value: "date_asc",     label: "En Eski" },
  { value: "title_asc",    label: "A-Z" },
  { value: "title_desc",   label: "Z-A" },
  { value: "updated_desc", label: "Son Güncellenen" },
  { value: "pinned_first", label: "Sabitliler Önce" },
];

const NOTE_TEMPLATES = {
  blank: { title: "", content: "", category: "other" },
  trade: {
    title: "[Varlık] Alım/Satım Kararı",
    content: `<h2>Karar: ALIM / SATIM</h2><p><strong>Varlık:</strong> </p><p><strong>Fiyat:</strong> </p><p><strong>Miktar:</strong> </p><p><strong>Tarih:</strong> </p><h2>Gerekçe</h2><ol><li></li><li></li><li></li></ol><h2>Risk Analizi</h2><ul><li><strong>Hedef fiyat:</strong> </li><li><strong>Stop-loss:</strong> </li><li><strong>Risk/Ödül oranı:</strong> </li></ul><h2>Sonuç</h2><p></p>`,
    category: "investment",
  },
  analysis: {
    title: "Piyasa Analizi — [Tarih]",
    content: `<h2>Genel Durum</h2><p></p><h2>Öne Çıkan Gelişmeler</h2><ul><li></li><li></li></ul><h2>Portföy Etkisi</h2><p></p><h2>Aksiyon Planı</h2><p></p>`,
    category: "analysis",
  },
  weekly: {
    title: "Haftalık Değerlendirme — [Hafta]",
    content: `<h2>Bu Haftanın Özeti</h2><p><strong>Portföy değişimi:</strong> </p><p><strong>En iyi performans:</strong> </p><p><strong>En kötü performans:</strong> </p><h2>Neler Öğrendim</h2><p></p><h2>Gelecek Hafta Planı</h2><p></p><h2>Duygusal Değerlendirme</h2><p>Bu hafta nasıl hissettim?</p>`,
    category: "analysis",
  },
  goal: {
    title: "Hedef: [Hedef Adı]",
    content: `<h2>Hedef Tanımı</h2><p></p><h2>Neden Bu Hedef Önemli?</h2><p></p><h2>Ulaşma Planı</h2><ol><li></li><li></li><li></li></ol><h2>Başarı Kriterleri</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"></li><li data-type="taskItem" data-checked="false"></li></ul><h2>İlerleme Notları</h2><p></p>`,
    category: "goal",
  },
  idea: {
    title: "💡 Yeni Fikir",
    content: `<h2>Fikir</h2><p></p><h2>Neden Önemli?</h2><p></p><h2>Nasıl Hayata Geçirilir?</h2><p></p>`,
    category: "idea",
  },
};

// ─── Helper functions ─────────────────────────────────────────────────────────
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function getCategoryConfig(value: string) {
  return NOTE_CATEGORIES.find(c => c.value === value) || NOTE_CATEGORIES[NOTE_CATEGORIES.length - 1];
}

function getMoodConfig(value: string | null | undefined) {
  if (!value) return null;
  return MOOD_OPTIONS.find(m => m.value === value) || null;
}

function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function sortNotes(noteList: Note[] | undefined | null, sort: string): Note[] {
  if (!noteList || !Array.isArray(noteList)) return [];
  const arr = [...noteList];
  switch (sort) {
    case "date_asc":     return arr.sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
    case "date_desc":    return arr.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
    case "title_asc":    return arr.sort((a, b) => a.title.localeCompare(b.title, "tr"));
    case "title_desc":   return arr.sort((a, b) => b.title.localeCompare(a.title, "tr"));
    case "updated_desc": return arr.sort((a, b) => new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime());
    case "pinned_first": return arr.sort((a, b) => (b.isPinned ?? 0) - (a.isPinned ?? 0));
    default:             return arr.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────
function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  const btn = (active: boolean, onClick: () => void, icon: React.ReactNode, tooltip: string) => (
    <button
      onClick={onClick}
      title={tooltip}
      className={`p-1.5 rounded transition-all text-xs font-bold ${active ? "bg-[#A78BFA] text-white" : "text-[#8892A4] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#F0F2F7]"}`}
    >
      {icon}
    </button>
  );

  const sep = () => <div className="w-px h-5 bg-[rgba(255,255,255,0.08)] mx-1" />;

  return (
    <div className="flex items-center flex-wrap gap-0.5 p-2 border-b border-[rgba(255,255,255,0.06)] bg-[#0E1117]">
      {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), <span className="font-black">B</span>, "Kalın (Ctrl+B)")}
      {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), <span className="italic">I</span>, "İtalik (Ctrl+I)")}
      {btn(editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), <span className="underline">U</span>, "Altı Çizili (Ctrl+U)")}
      {btn(editor.isActive("strike"), () => editor.chain().focus().toggleStrike().run(), <span className="line-through">S</span>, "Üstü Çizili")}
      {sep()}
      {btn(editor.isActive("heading", { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), <Heading1 className="h-3.5 w-3.5" />, "Büyük Başlık")}
      {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 className="h-3.5 w-3.5" />, "Orta Başlık")}
      {btn(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), <Heading3 className="h-3.5 w-3.5" />, "Küçük Başlık")}
      {sep()}
      {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), <List className="h-3.5 w-3.5" />, "Madde İşaretli Liste")}
      {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered className="h-3.5 w-3.5" />, "Numaralı Liste")}
      {btn(editor.isActive("taskList"), () => editor.chain().focus().toggleTaskList().run(), <CheckSquare className="h-3.5 w-3.5" />, "Yapılacaklar Listesi")}
      {sep()}
      {btn(editor.isActive("code"), () => editor.chain().focus().toggleCode().run(), <Code className="h-3.5 w-3.5" />, "Kod Satırı")}
      {btn(editor.isActive("codeBlock"), () => editor.chain().focus().toggleCodeBlock().run(), <span className="font-mono text-[10px]">{"{}"}</span>, "Kod Bloğu")}
      {btn(editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), <Quote className="h-3.5 w-3.5" />, "Alıntı")}
      {btn(false, () => editor.chain().focus().setHorizontalRule().run(), <Minus className="h-3.5 w-3.5" />, "Yatay Çizgi")}
      {sep()}
      {btn(false, () => editor.chain().focus().undo().run(), <Undo className="h-3.5 w-3.5" />, "Geri Al (Ctrl+Z)")}
      {btn(false, () => editor.chain().focus().redo().run(), <Redo className="h-3.5 w-3.5" />, "İleri Al (Ctrl+Y)")}
    </div>
  );
}

// ─── Note Card ────────────────────────────────────────────────────────────────
function NoteCard({
  note, index, isSelected, onSelect, onPin, onDelete, onArchive, searchTerm,
}: {
  note: Note; index: number; isSelected: boolean;
  onSelect: () => void; onPin: () => void; onDelete: () => void; onArchive: () => void;
  searchTerm: string;
}) {
  const cat = getCategoryConfig(note.category);
  const mood = getMoodConfig(note.mood);
  const excerpt = stripHtml(note.content).slice(0, 120);

  function highlight(text: string, term: string) {
    if (!term.trim()) return <>{text}</>;
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return <>{parts.map((p, i) => regex.test(p) ? <mark key={i} className="bg-[#FFB833] text-[#080A0F] rounded px-0.5">{p}</mark> : p)}</>;
  }

  return (
    <div
      onClick={onSelect}
      className="relative group cursor-pointer rounded-xl border transition-all duration-200 mb-1.5"
      style={{
        padding: "12px 16px",
        borderRadius: "10px",
        background: isSelected ? "rgba(167,139,250,0.06)" : "transparent",
        border: isSelected ? "1px solid #A78BFA" : "1px solid rgba(255,255,255,0.06)",
        borderLeft: isSelected ? "3px solid #A78BFA" : "3px solid transparent",
      }}
      data-testid={`note-card-${note.id}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {note.isPinned === 1 && <Star className="h-3 w-3 text-[#FFB833] fill-[#FFB833] flex-shrink-0" />}
          <span className="text-sm font-medium text-[#F0F2F7] truncate">
            {highlight(note.title || "Başlıksız", searchTerm)}
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#4E5A6B] whitespace-nowrap flex-shrink-0">{index + 1}</span>
      </div>

      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: `${cat.color}18`, color: cat.color }}>
          {cat.label}
        </span>
        {mood && (
          <span className="text-[11px]">{mood.label.split(" ")[0]}</span>
        )}
        <span className="text-[10px] text-[#4E5A6B]">{formatDate(note.createdAt)}</span>
        {note.assetTicker && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-[rgba(75,158,255,0.12)] text-[#4B9EFF]">
            {note.assetTicker}
          </span>
        )}
      </div>

      {excerpt && (
        <p className="text-xs text-[#4E5A6B] line-clamp-2 leading-relaxed">
          {highlight(excerpt, searchTerm)}
        </p>
      )}

      {note.tags && note.tags.length > 0 && (
        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
          {note.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] text-[#A78BFA] font-mono">#{tag}</span>
          ))}
          {note.tags.length > 3 && <span className="text-[10px] text-[#4E5A6B]">+{note.tags.length - 3}</span>}
        </div>
      )}

      {/* Hover actions */}
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <button onClick={e => { e.stopPropagation(); onPin(); }} title={note.isPinned === 1 ? "Sabitlemeyi Kaldır" : "Sabitle"}
          className="p-1 rounded-lg bg-[#151A23] border border-[rgba(255,255,255,0.06)] hover:border-[#FFB833] text-[#4E5A6B] hover:text-[#FFB833] transition-colors">
          <Star className={`h-3 w-3 ${note.isPinned === 1 ? "fill-[#FFB833] text-[#FFB833]" : ""}`} />
        </button>
        <button onClick={e => { e.stopPropagation(); onArchive(); }} title="Arşivle"
          className="p-1 rounded-lg bg-[#151A23] border border-[rgba(255,255,255,0.06)] hover:border-[#8892A4] text-[#4E5A6B] hover:text-[#8892A4] transition-colors">
          <Archive className="h-3 w-3" />
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete(); }} title="Sil"
          className="p-1 rounded-lg bg-[#151A23] border border-[rgba(255,255,255,0.06)] hover:border-[#FF4757] text-[#4E5A6B] hover:text-[#FF4757] transition-colors">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Template Picker ──────────────────────────────────────────────────────────
function TemplatePicker({ onSelect, onClose }: { onSelect: (key: string) => void; onClose: () => void }) {
  const templates = [
    { key: "blank",    icon: "📝", title: "Boş Not",           desc: "Sıfırdan başla" },
    { key: "trade",    icon: "💰", title: "Alım/Satım Kararı", desc: "İşlem notları için" },
    { key: "analysis", icon: "📊", title: "Piyasa Analizi",    desc: "Piyasa değerlendirme" },
    { key: "weekly",   icon: "📅", title: "Haftalık Değerlendirme", desc: "Haftalık özet" },
    { key: "goal",     icon: "🎯", title: "Hedef Notu",        desc: "Hedef takibi" },
    { key: "idea",     icon: "💡", title: "Fikir / Plan",      desc: "Yeni fikirler" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-[#0E1117] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 w-full max-w-lg shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-[#F0F2F7]">Nasıl bir not eklemek istersiniz?</h3>
          <button onClick={onClose} className="text-[#4E5A6B] hover:text-[#F0F2F7] transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {templates.map(t => (
            <button key={t.key} onClick={() => { onSelect(t.key); onClose(); }}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[rgba(255,255,255,0.06)] hover:border-[#A78BFA] hover:bg-[rgba(167,139,250,0.06)] transition-all text-center group">
              <span className="text-2xl">{t.icon}</span>
              <span className="text-sm font-medium text-[#F0F2F7] group-hover:text-[#A78BFA] transition-colors">{t.title}</span>
              <span className="text-[10px] text-[#4E5A6B]">{t.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Notes Page ──────────────────────────────────────────────────────────
export default function NotesPage() {
  const { toast } = useToast();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterMood, setFilterMood] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("other");
  const [editMood, setEditMood] = useState("");
  const [editAssetTicker, setEditAssetTicker] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "editing" | "saved" | "error">("idle");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>();

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") setSearchTerm("");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: true,
        link: { openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: "Buraya notunuzu yazın... (Markdown desteklenir)" }),
    ],
    content: "",
    onUpdate: ({ editor }) => {
      if (!isEditing) return;
      setSaveStatus("editing");
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        handleSave(editor.getHTML());
      }, 2000);
    },
  });

  // Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && isEditing) {
        e.preventDefault();
        if (editor) handleSave(editor.getHTML());
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isEditing, editor, editTitle, editCategory, editMood, editAssetTicker, editTags]);

  // Fetch notes
  const { data: allNotes = [], isLoading } = useQuery<Note[]>({
    queryKey: ["/api/notes", showArchive],
    queryFn: () => fetch(`/api/notes?isArchived=${showArchive}`).then(r => r.json()),
  });

  const { data: assetList = [] } = useQuery<any[]>({ queryKey: ["/api/assets"] });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/notes", data),
    onSuccess: async (res: any) => {
      const note = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setSelectedNote(note);
      setIsEditing(true);
      loadNoteIntoEditor(note);
      toast({ title: "Not oluşturuldu" });
    },
    onError: () => toast({ title: "Hata", description: "Not oluşturulamadı", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/notes/${id}`, data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
    onError: () => { setSaveStatus("error"); toast({ title: "Kaydetme hatası", variant: "destructive" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/notes/${id}`, undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setSelectedNote(null);
      setIsEditing(false);
      toast({ title: "Not silindi" });
    },
    onError: () => toast({ title: "Hata", description: "Not silinemedi", variant: "destructive" }),
  });

  function loadNoteIntoEditor(note: Note) {
    setEditTitle(note.title);
    setEditCategory(note.category);
    setEditMood(note.mood || "");
    setEditAssetTicker(note.assetTicker || "");
    setEditTags(note.tags || []);
    editor?.commands.setContent(note.content || "");
    setSaveStatus("idle");
  }

  function handleSelectNote(note: Note) {
    setSelectedNote(note);
    setIsEditing(false);
    loadNoteIntoEditor(note);
  }

  function handleEdit() {
    if (selectedNote) { setIsEditing(true); editor?.commands.focus(); }
  }

  function handleSave(content?: string) {
    if (!selectedNote) return;
    const c = content ?? editor?.getHTML() ?? "";
    updateMutation.mutate({
      id: selectedNote.id,
      data: { title: editTitle, content: c, category: editCategory, mood: editMood || null, assetTicker: editAssetTicker || null, tags: editTags },
    });
    setSelectedNote(prev => prev ? { ...prev, title: editTitle, content: c, category: editCategory } : prev);
  }

  function handlePin(note: Note) {
    updateMutation.mutate({ id: note.id, data: { isPinned: note.isPinned === 1 ? 0 : 1 } });
    queryClient.setQueryData(["/api/notes", showArchive], (old: Note[] | undefined) =>
      old?.map(n => n.id === note.id ? { ...n, isPinned: note.isPinned === 1 ? 0 : 1 } : n)
    );
  }

  function handleArchive(note: Note) {
    updateMutation.mutate({ id: note.id, data: { isArchived: note.isArchived === 1 ? 0 : 1 } });
    setSelectedNote(null);
    queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
    toast({ title: note.isArchived === 1 ? "Arşivden çıkarıldı" : "Arşivlendi" });
  }

  function handleTemplate(templateKey: string) {
    const tpl = NOTE_TEMPLATES[templateKey as keyof typeof NOTE_TEMPLATES] || NOTE_TEMPLATES.blank;
    createMutation.mutate({ title: tpl.title, content: tpl.content, category: tpl.category, tags: [], isPinned: 0, isArchived: 0 });
  }

  function handleAddTag(e: React.KeyboardEvent) {
    if (e.key === "Enter" && tagInput.trim()) {
      const tag = tagInput.trim().toLowerCase().replace(/^#/, "");
      if (!editTags.includes(tag) && editTags.length < 10) {
        setEditTags(prev => [...prev, tag]);
      }
      setTagInput("");
    }
  }

  function copyNoteText() {
    if (!selectedNote) return;
    navigator.clipboard.writeText(`${selectedNote.title}\n\n${stripHtml(selectedNote.content)}`);
    toast({ title: "Panoya kopyalandı" });
  }

  function downloadNote() {
    if (!selectedNote) return;
    const text = `# ${selectedNote.title}\n\n${stripHtml(selectedNote.content)}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `${selectedNote.title.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ\s]/g, "")}.txt`;
    a.click(); URL.revokeObjectURL(url);
  }

  // Filter + sort notes
  const visibleNotes = (() => {
    let list: Note[] = Array.isArray(allNotes) ? allNotes : [];
    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      list = list.filter(n =>
        n.title.toLowerCase().includes(term) ||
        stripHtml(n.content).toLowerCase().includes(term) ||
        (n.tags || []).some(t => t.toLowerCase().includes(term)) ||
        (n.assetTicker || "").toLowerCase().includes(term)
      );
    }
    if (filterCategory !== "all") list = list.filter(n => n.category === filterCategory);
    if (filterMood !== "all") list = list.filter(n => n.mood === filterMood);
    return sortNotes(list, sortBy);
  })();

  const pinnedNotes = visibleNotes.filter(n => n.isPinned === 1);
  const otherNotes  = visibleNotes.filter(n => n.isPinned !== 1);

  // Word count
  const wordCount = editor ? editor.getText().trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = editor ? editor.getText().length : 0;
  const readTime  = Math.max(1, Math.ceil(wordCount / 200));

  // Stats
  const stats = {
    total: allNotes.length,
    thisMonth: allNotes.filter(n => { const d = new Date(n.createdAt!); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length,
    thisWeek: allNotes.filter(n => { const d = new Date(n.createdAt!); const now = new Date(); const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7); return d >= weekAgo; }).length,
    catDist: NOTE_CATEGORIES.map(c => ({ ...c, count: allNotes.filter(n => n.category === c.value).length })).filter(c => c.count > 0),
    topTags: (() => {
      const tagMap = new Map<string, number>();
      allNotes.forEach(n => (n.tags || []).forEach(t => tagMap.set(t, (tagMap.get(t) || 0) + 1)));
      return Array.from(tagMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
    })(),
  };

  return (
    <div className="flex flex-col h-[calc(100vh-48px)]">
      {/* Template picker */}
      {showTemplatePicker && <TemplatePicker onSelect={handleTemplate} onClose={() => setShowTemplatePicker(false)} />}

      {/* Stats modal */}
      {showStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowStats(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-[#0E1117] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-[#F0F2F7]">📈 Not Defteri İstatistikleri</h3>
              <button onClick={() => setShowStats(false)} className="text-[#4E5A6B] hover:text-[#F0F2F7]"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[["Toplam Not", stats.total], ["Bu Ay", stats.thisMonth], ["Bu Hafta", stats.thisWeek]].map(([label, val]) => (
                <div key={label as string} className="bg-[#151A23] rounded-xl p-3 text-center border border-[rgba(255,255,255,0.06)]">
                  <p className="text-2xl font-bold text-[#A78BFA]">{val}</p>
                  <p className="text-xs text-[#4E5A6B] mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            {stats.catDist.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-[#4E5A6B] uppercase tracking-wider mb-2 font-medium">Kategori Dağılımı</p>
                <div className="space-y-2">
                  {stats.catDist.map(c => (
                    <div key={c.value} className="flex items-center gap-2">
                      <span className="text-xs min-w-[80px]" style={{ color: c.color }}>{c.label}</span>
                      <div className="flex-1 h-1.5 bg-[#151A23] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(c.count / stats.total) * 100}%`, background: c.color }} />
                      </div>
                      <span className="text-xs text-[#4E5A6B] w-6 text-right">{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {stats.topTags.length > 0 && (
              <div>
                <p className="text-xs text-[#4E5A6B] uppercase tracking-wider mb-2 font-medium">En Sık Kullanılan Etiketler</p>
                <div className="flex flex-wrap gap-2">
                  {stats.topTags.map(([tag, count]) => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[rgba(167,139,250,0.12)] text-[#A78BFA]">
                      #{tag} <span className="text-[10px] text-[#4E5A6B]">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(167,139,250,0.12)" }}>
            <BookOpen className="h-4 w-4 text-[#A78BFA]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#F0F2F7]">Not Defteri</h1>
            <p className="text-xs text-[#4E5A6B]">{allNotes.length} not</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#4E5A6B]" />
          <input
            ref={searchRef}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Notlarda ara... (Ctrl+K)"
            className="w-full pl-9 pr-8 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] placeholder:text-[#4E5A6B] focus:outline-none focus:border-[#A78BFA] transition-colors"
            data-testid="input-notes-search"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#4E5A6B] hover:text-[#F0F2F7]">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Filter */}
          <div className="relative">
            <button onClick={() => setShowFilters(!showFilters)} data-testid="button-notes-filter"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${showFilters || filterCategory !== "all" || filterMood !== "all" ? "border-[#A78BFA] bg-[rgba(167,139,250,0.08)] text-[#A78BFA]" : "border-[rgba(255,255,255,0.06)] bg-[#151A23] text-[#8892A4] hover:text-[#F0F2F7]"}`}>
              <Filter className="h-3.5 w-3.5" /> Filtrele
              {(filterCategory !== "all" || filterMood !== "all") && (
                <span className="ml-0.5 w-4 h-4 rounded-full bg-[#A78BFA] text-white text-[9px] flex items-center justify-center font-bold">
                  {[filterCategory !== "all", filterMood !== "all"].filter(Boolean).length}
                </span>
              )}
            </button>
            {showFilters && (
              <div className="absolute top-full mt-1 left-0 z-20 bg-[#0E1117] border border-[rgba(255,255,255,0.1)] rounded-xl p-3 shadow-2xl min-w-[220px]">
                <p className="text-[10px] text-[#4E5A6B] uppercase tracking-wider mb-2 font-medium">Kategori</p>
                <div className="space-y-1 mb-3">
                  <button onClick={() => setFilterCategory("all")} className={`w-full text-left text-xs px-2 py-1.5 rounded-lg transition-colors ${filterCategory === "all" ? "bg-[rgba(167,139,250,0.12)] text-[#A78BFA]" : "text-[#8892A4] hover:text-[#F0F2F7]"}`}>Tümü</button>
                  {NOTE_CATEGORIES.map(c => (
                    <button key={c.value} onClick={() => setFilterCategory(c.value)}
                      className={`w-full text-left text-xs px-2 py-1.5 rounded-lg transition-colors ${filterCategory === c.value ? "bg-[rgba(167,139,250,0.12)] text-[#A78BFA]" : "text-[#8892A4] hover:text-[#F0F2F7]"}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[#4E5A6B] uppercase tracking-wider mb-2 font-medium">Duygu Durumu</p>
                <div className="space-y-1 mb-3">
                  <button onClick={() => setFilterMood("all")} className={`w-full text-left text-xs px-2 py-1.5 rounded-lg transition-colors ${filterMood === "all" ? "bg-[rgba(167,139,250,0.12)] text-[#A78BFA]" : "text-[#8892A4] hover:text-[#F0F2F7]"}`}>Tümü</button>
                  {MOOD_OPTIONS.map(m => (
                    <button key={m.value} onClick={() => setFilterMood(m.value)}
                      className={`w-full text-left text-xs px-2 py-1.5 rounded-lg transition-colors ${filterMood === m.value ? "bg-[rgba(167,139,250,0.12)] text-[#A78BFA]" : "text-[#8892A4] hover:text-[#F0F2F7]"}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
                {(filterCategory !== "all" || filterMood !== "all") && (
                  <button onClick={() => { setFilterCategory("all"); setFilterMood("all"); }}
                    className="w-full text-xs text-[#FF4757] hover:text-[#FF4757]/80 transition-colors py-1">
                    Filtreleri Temizle
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <button onClick={() => setShowSort(!showSort)} data-testid="button-notes-sort"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-[rgba(255,255,255,0.06)] bg-[#151A23] text-[#8892A4] hover:text-[#F0F2F7] transition-all">
              <SortAsc className="h-3.5 w-3.5" />
              {SORT_OPTIONS.find(s => s.value === sortBy)?.label || "Sırala"}
            </button>
            {showSort && (
              <div className="absolute top-full mt-1 right-0 z-20 bg-[#0E1117] border border-[rgba(255,255,255,0.1)] rounded-xl p-2 shadow-2xl min-w-[160px]">
                {SORT_OPTIONS.map(s => (
                  <button key={s.value} onClick={() => { setSortBy(s.value); setShowSort(false); }}
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors ${sortBy === s.value ? "bg-[rgba(167,139,250,0.12)] text-[#A78BFA]" : "text-[#8892A4] hover:text-[#F0F2F7]"}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Archive toggle */}
          <button onClick={() => { setShowArchive(!showArchive); setSelectedNote(null); }} data-testid="button-notes-archive"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${showArchive ? "border-[#A78BFA] bg-[rgba(167,139,250,0.08)] text-[#A78BFA]" : "border-[rgba(255,255,255,0.06)] bg-[#151A23] text-[#8892A4] hover:text-[#F0F2F7]"}`}>
            <Archive className="h-3.5 w-3.5" /> {showArchive ? "Arşiv" : "Arşiv"}
          </button>

          {/* Stats */}
          <button onClick={() => setShowStats(true)} data-testid="button-notes-stats"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-[rgba(255,255,255,0.06)] bg-[#151A23] text-[#8892A4] hover:text-[#F0F2F7] transition-all">
            <BarChart2 className="h-3.5 w-3.5" /> İstatistikler
          </button>

          {/* New note */}
          <button onClick={() => setShowTemplatePicker(true)} data-testid="button-new-note"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: "#A78BFA", color: "#080A0F" }}>
            <Plus className="h-4 w-4" /> Not Ekle
          </button>
        </div>
      </div>

      {/* Active filters */}
      {(filterCategory !== "all" || filterMood !== "all") && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {filterCategory !== "all" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-[rgba(167,139,250,0.1)] text-[#A78BFA] border border-[rgba(167,139,250,0.2)]">
              Kategori: {getCategoryConfig(filterCategory).label}
              <button onClick={() => setFilterCategory("all")}><X className="h-3 w-3" /></button>
            </span>
          )}
          {filterMood !== "all" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-[rgba(167,139,250,0.1)] text-[#A78BFA] border border-[rgba(167,139,250,0.2)]">
              Duygu: {getMoodConfig(filterMood)?.label}
              <button onClick={() => setFilterMood("all")}><X className="h-3 w-3" /></button>
            </span>
          )}
        </div>
      )}

      {/* Main layout: left list + right editor */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left panel — Note List */}
        <div className="w-[300px] flex-shrink-0 flex flex-col">
          <div className="flex-1 overflow-y-auto pr-1 space-y-0">
            {isLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-24 skeleton-shimmer rounded-xl" />)}
              </div>
            ) : visibleNotes.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="h-10 w-10 text-[#4E5A6B] mx-auto mb-3" />
                <p className="text-sm text-[#4E5A6B]">{debouncedSearch ? "Arama sonucu bulunamadı" : showArchive ? "Arşiv boş" : "Henüz not eklenmemiş"}</p>
                {!showArchive && !debouncedSearch && (
                  <button onClick={() => setShowTemplatePicker(true)} className="mt-3 text-xs text-[#A78BFA] hover:text-[#A78BFA]/80 transition-colors">
                    İlk notunu ekle →
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Pinned section */}
                {pinnedNotes.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 py-1.5 px-1">
                      <Pin className="h-3 w-3 text-[#FFB833]" />
                      <span className="text-[10px] font-medium text-[#4E5A6B] uppercase tracking-wider">Sabitlenmiş</span>
                    </div>
                    {pinnedNotes.map((note, i) => (
                      <NoteCard key={note.id} note={note} index={i} isSelected={selectedNote?.id === note.id}
                        onSelect={() => handleSelectNote(note)}
                        onPin={() => handlePin(note)}
                        onDelete={() => deleteMutation.mutate(note.id)}
                        onArchive={() => handleArchive(note)}
                        searchTerm={debouncedSearch} />
                    ))}
                    {otherNotes.length > 0 && (
                      <div className="flex items-center gap-2 py-1.5 px-1 mt-2">
                        <span className="text-[10px] font-medium text-[#4E5A6B] uppercase tracking-wider">Diğer Notlar ({otherNotes.length})</span>
                      </div>
                    )}
                  </>
                )}
                {/* Other notes */}
                {otherNotes.map((note, i) => (
                  <NoteCard key={note.id} note={note} index={pinnedNotes.length + i} isSelected={selectedNote?.id === note.id}
                    onSelect={() => handleSelectNote(note)}
                    onPin={() => handlePin(note)}
                    onDelete={() => deleteMutation.mutate(note.id)}
                    onArchive={() => handleArchive(note)}
                    searchTerm={debouncedSearch} />
                ))}
              </>
            )}
          </div>
        </div>

        {/* Right panel — Editor / Detail */}
        <div className="flex-1 min-w-0 flex flex-col border border-[rgba(255,255,255,0.06)] rounded-2xl overflow-hidden bg-[#0E1117]">
          {!selectedNote ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(167,139,250,0.08)" }}>
                <BookOpen className="h-8 w-8 text-[#A78BFA]" />
              </div>
              <p className="text-[#F0F2F7] font-medium">Bir not seçin</p>
              <p className="text-sm text-[#4E5A6B] max-w-xs">Sol panelden bir nota tıklayın veya yeni not oluşturun</p>
              <button onClick={() => setShowTemplatePicker(true)}
                className="mt-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: "rgba(167,139,250,0.12)", color: "#A78BFA" }}>
                + Yeni Not Ekle
              </button>
            </div>
          ) : (
            <>
              {/* Editor top bar */}
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-2">
                  {isEditing && (
                    <button onClick={() => { setIsEditing(false); if (selectedNote) loadNoteIntoEditor(selectedNote); }}
                      className="flex items-center gap-1 text-xs text-[#8892A4] hover:text-[#F0F2F7] transition-colors" data-testid="button-note-back">
                      <ChevronLeft className="h-4 w-4" /> Geri
                    </button>
                  )}
                  {/* Save status */}
                  {isEditing && (
                    <span className={`text-xs ${saveStatus === "saved" ? "text-[#00D4AA]" : saveStatus === "editing" ? "text-[#FFB833]" : saveStatus === "error" ? "text-[#FF4757]" : "text-[#4E5A6B]"}`}>
                      {saveStatus === "saved" ? "✓ Kaydedildi" : saveStatus === "editing" ? "●●● Düzenleniyor..." : saveStatus === "error" ? "⚠️ Kaydetme hatası" : ""}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={copyNoteText} title="Panoya Kopyala" data-testid="button-note-copy"
                    className="p-1.5 rounded-lg text-[#4E5A6B] hover:text-[#F0F2F7] hover:bg-[rgba(255,255,255,0.06)] transition-all">
                    <Copy className="h-4 w-4" />
                  </button>
                  <button onClick={downloadNote} title="İndir" data-testid="button-note-download"
                    className="p-1.5 rounded-lg text-[#4E5A6B] hover:text-[#F0F2F7] hover:bg-[rgba(255,255,255,0.06)] transition-all">
                    <Download className="h-4 w-4" />
                  </button>
                  {!isEditing && (
                    <button onClick={() => handleArchive(selectedNote)} title={selectedNote.isArchived === 1 ? "Arşivden Çıkar" : "Arşivle"} data-testid="button-note-archive"
                      className="p-1.5 rounded-lg text-[#4E5A6B] hover:text-[#8892A4] hover:bg-[rgba(255,255,255,0.06)] transition-all">
                      <Archive className="h-4 w-4" />
                    </button>
                  )}
                  {!isEditing && (
                    <button onClick={() => handlePin(selectedNote)} title={selectedNote.isPinned === 1 ? "Sabitlemeyi Kaldır" : "Sabitle"} data-testid="button-note-pin"
                      className="p-1.5 rounded-lg text-[#4E5A6B] hover:text-[#FFB833] hover:bg-[rgba(255,184,51,0.06)] transition-all">
                      <Star className={`h-4 w-4 ${selectedNote.isPinned === 1 ? "fill-[#FFB833] text-[#FFB833]" : ""}`} />
                    </button>
                  )}
                  {!isEditing && (
                    <button onClick={() => deleteMutation.mutate(selectedNote.id)} title="Sil" data-testid="button-note-delete"
                      className="p-1.5 rounded-lg text-[#4E5A6B] hover:text-[#FF4757] hover:bg-[rgba(255,71,87,0.06)] transition-all">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  {!isEditing ? (
                    <button onClick={handleEdit} data-testid="button-note-edit"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ background: "rgba(167,139,250,0.12)", color: "#A78BFA" }}>
                      <Pencil className="h-3.5 w-3.5" /> Düzenle
                    </button>
                  ) : (
                    <button onClick={() => handleSave()} data-testid="button-note-save"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ background: "#A78BFA", color: "#080A0F" }}>
                      <Save className="h-3.5 w-3.5" /> Kaydet
                    </button>
                  )}
                </div>
              </div>

              {/* Content area */}
              <div className="flex-1 overflow-y-auto">
                {/* Title */}
                <div className="px-5 pt-5 pb-3">
                  {isEditing ? (
                    <input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      placeholder="Not başlığını girin..."
                      className="w-full text-xl font-bold text-[#F0F2F7] bg-transparent border-none outline-none placeholder:text-[#4E5A6B]"
                      data-testid="input-note-title"
                    />
                  ) : (
                    <h2 className="text-xl font-bold text-[#F0F2F7]">{selectedNote.title || "Başlıksız"}</h2>
                  )}
                </div>

                {/* Meta row */}
                <div className="px-5 pb-3 flex items-center gap-2 flex-wrap">
                  {isEditing ? (
                    <>
                      {/* Category */}
                      <select value={editCategory} onChange={e => setEditCategory(e.target.value)}
                        className="text-xs px-2 py-1 rounded-lg bg-[#151A23] border border-[rgba(255,255,255,0.06)] text-[#F0F2F7] outline-none cursor-pointer"
                        data-testid="select-note-category">
                        {NOTE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                      {/* Asset */}
                      <select value={editAssetTicker} onChange={e => setEditAssetTicker(e.target.value)}
                        className="text-xs px-2 py-1 rounded-lg bg-[#151A23] border border-[rgba(255,255,255,0.06)] text-[#F0F2F7] outline-none cursor-pointer"
                        data-testid="select-note-asset">
                        <option value="">İlişkili Varlık</option>
                        {assetList.map((a: any) => <option key={a.id} value={a.symbol}>{a.symbol} — {a.name}</option>)}
                      </select>
                      {/* Mood */}
                      <select value={editMood} onChange={e => setEditMood(e.target.value)}
                        className="text-xs px-2 py-1 rounded-lg bg-[#151A23] border border-[rgba(255,255,255,0.06)] text-[#F0F2F7] outline-none cursor-pointer"
                        data-testid="select-note-mood">
                        <option value="">Duygu Durumu</option>
                        {MOOD_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: `${getCategoryConfig(selectedNote.category).color}18`, color: getCategoryConfig(selectedNote.category).color }}>
                        {getCategoryConfig(selectedNote.category).label}
                      </span>
                      {selectedNote.assetTicker && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono bg-[rgba(75,158,255,0.12)] text-[#4B9EFF]">{selectedNote.assetTicker}</span>
                      )}
                      {getMoodConfig(selectedNote.mood) && (
                        <span className="text-sm" title={getMoodConfig(selectedNote.mood)?.label}>{getMoodConfig(selectedNote.mood)?.label}</span>
                      )}
                    </>
                  )}
                  {(selectedNote.tags || []).length > 0 && !isEditing && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {(selectedNote.tags || []).map(tag => (
                        <span key={tag} className="text-xs text-[#A78BFA] font-mono">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tags editor */}
                {isEditing && (
                  <div className="px-5 pb-3 flex items-center gap-2 flex-wrap">
                    {editTags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[rgba(167,139,250,0.12)] text-[#A78BFA]">
                        #{tag}
                        <button onClick={() => setEditTags(prev => prev.filter(t => t !== tag))}><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                    <input
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                      placeholder="+ Etiket ekle (Enter)"
                      className="text-xs px-2 py-0.5 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-full text-[#F0F2F7] placeholder:text-[#4E5A6B] outline-none w-32"
                      data-testid="input-note-tag"
                    />
                  </div>
                )}

                {/* Date info */}
                <div className="px-5 pb-3 border-b border-[rgba(255,255,255,0.04)]">
                  <p className="text-[10px] text-[#4E5A6B]">
                    📅 Oluşturulma: {formatDateTime(selectedNote.createdAt)}
                    {selectedNote.updatedAt && selectedNote.updatedAt !== selectedNote.createdAt && (
                      <> &nbsp;·&nbsp; ✏️ Güncelleme: {formatDateTime(selectedNote.updatedAt)}</>
                    )}
                  </p>
                </div>

                {/* Toolbar (editing mode) */}
                {isEditing && <EditorToolbar editor={editor} />}

                {/* Editor */}
                <div className="px-5 py-4 flex-1">
                  {isEditing ? (
                    <div className="tiptap-editor" onClick={() => editor?.commands.focus()}>
                      <EditorContent editor={editor} className="min-h-[300px] text-sm text-[#D0D6E2] leading-relaxed focus:outline-none" />
                    </div>
                  ) : (
                    <div
                      className="prose prose-invert prose-sm max-w-none text-[#D0D6E2] leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: selectedNote.content || "<p class='text-[#4E5A6B]'>Bu notun içeriği boş.</p>" }}
                    />
                  )}
                </div>
              </div>

              {/* Word count footer (editing mode) */}
              {isEditing && (
                <div className="px-5 py-2 border-t border-[rgba(255,255,255,0.04)] bg-[#0E1117]">
                  <p className="text-[10px] text-[#4E5A6B] font-mono">
                    {wordCount} kelime &nbsp;·&nbsp; {charCount} karakter &nbsp;·&nbsp; ~{readTime} dk okuma süresi
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* TipTap global styles */}
      <style>{`
        .tiptap-editor .ProseMirror { outline: none; min-height: 300px; }
        .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before { color: #4E5A6B; content: attr(data-placeholder); float: left; height: 0; pointer-events: none; }
        .tiptap-editor .ProseMirror h1 { font-size: 1.5rem; font-weight: 700; color: #F0F2F7; margin: 1.2rem 0 0.5rem; }
        .tiptap-editor .ProseMirror h2 { font-size: 1.2rem; font-weight: 600; color: #F0F2F7; margin: 1rem 0 0.4rem; }
        .tiptap-editor .ProseMirror h3 { font-size: 1rem; font-weight: 600; color: #F0F2F7; margin: 0.8rem 0 0.3rem; }
        .tiptap-editor .ProseMirror ul, .tiptap-editor .ProseMirror ol { padding-left: 1.5rem; margin: 0.4rem 0; }
        .tiptap-editor .ProseMirror li { margin: 0.1rem 0; }
        .tiptap-editor .ProseMirror blockquote { border-left: 3px solid #A78BFA; padding-left: 1rem; color: #8892A4; margin: 0.5rem 0; }
        .tiptap-editor .ProseMirror code { background: rgba(167,139,250,0.12); color: #A78BFA; padding: 0.1rem 0.3rem; border-radius: 4px; font-size: 0.85em; }
        .tiptap-editor .ProseMirror pre { background: #151A23; padding: 0.75rem 1rem; border-radius: 8px; overflow-x: auto; margin: 0.5rem 0; }
        .tiptap-editor .ProseMirror pre code { background: none; color: #00D4AA; }
        .tiptap-editor .ProseMirror hr { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 1rem 0; }
        .tiptap-editor .ProseMirror ul[data-type="taskList"] { list-style: none; padding: 0; }
        .tiptap-editor .ProseMirror li[data-type="taskItem"] { display: flex; align-items: baseline; gap: 0.5rem; }
        .tiptap-editor .ProseMirror li[data-type="taskItem"] > label { cursor: pointer; }
        .tiptap-editor .ProseMirror li[data-type="taskItem"][data-checked="true"] > div { text-decoration: line-through; color: #4E5A6B; }
        .prose h1 { font-size: 1.4rem; font-weight: 700; color: #F0F2F7; margin: 1rem 0 0.4rem; }
        .prose h2 { font-size: 1.1rem; font-weight: 600; color: #F0F2F7; margin: 0.8rem 0 0.3rem; }
        .prose h3 { font-size: 1rem; font-weight: 600; color: #D0D6E2; margin: 0.6rem 0 0.2rem; }
        .prose ul { padding-left: 1.2rem; }
        .prose ol { padding-left: 1.2rem; }
        .prose blockquote { border-left: 3px solid #A78BFA; padding-left: 0.8rem; color: #8892A4; }
        .prose code { background: rgba(167,139,250,0.12); color: #A78BFA; padding: 0.1rem 0.3rem; border-radius: 4px; }
        .prose pre { background: #151A23; padding: 0.75rem; border-radius: 8px; }
        .prose strong { color: #F0F2F7; }
        .prose a { color: #A78BFA; }
      `}</style>
    </div>
  );
}
