import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Plus, Search, Calendar, ChevronDown, FileText, FileSpreadsheet,
  Camera, Mic, Pencil, Trash2, ChevronLeft, ChevronRight, X
} from "lucide-react";
import { useState, useMemo } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AddTransactionDialog } from "@/components/add-transaction-dialog";
import { EditTransactionDialog } from "@/components/edit-transaction-dialog";
import { exportTransactionsToPDF, exportTransactionsToExcel } from "@/lib/export-utils";
import type { Asset, Transaction } from "@shared/schema";

const fmt = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtCurrency = (amount: number, currency: string = "TRY") => {
  const symbols: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€", BTC: "₿", ETH: "Ξ" };
  return `${symbols[currency] || ""}${fmt(amount)}`;
};

const typeConfig: Record<string, { label: string; color: string; bg: string }> = {
  alış: { label: "alış", color: "#00D4AA", bg: "rgba(0,212,170,0.15)" },
  satış: { label: "satış", color: "#FF4757", bg: "rgba(255,71,87,0.15)" },
};

const typeOptions = ["Tümü", "Alış", "Satış"];

export default function Transactions() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("Tümü");
  const [assetFilter, setAssetFilter] = useState("Tümü");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const itemsPerPage = 10;

  const { data: transactions, isLoading: txLoading, error: txError } = useQuery<Transaction[]>({ queryKey: ["/api/transactions"] });
  const { data: assets } = useQuery<Asset[]>({ queryKey: ["/api/assets"] });

  const assetOptions = useMemo(() => {
    const opts = ["Tümü"];
    if (assets) assets.forEach(a => { if (!opts.includes(a.symbol)) opts.push(a.symbol); });
    return opts;
  }, [assets]);

  const filteredTransactions = useMemo(() => {
    const txs = transactions || [];
    return txs.filter((t) => {
      const asset = assets?.find((a) => a.id === t.assetId);
      const haystack = [
        asset?.symbol || "", asset?.name || "", t.type, t.notes || ""
      ].join(" ").toLowerCase();
      const matchesSearch = !searchTerm.trim() || haystack.includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "Tümü" || t.type === typeFilter.toLowerCase();
      const matchesAsset = assetFilter === "Tümü" || asset?.symbol === assetFilter;
      let matchesDate = true;
      if (startDate) matchesDate = matchesDate && new Date(t.date) >= new Date(startDate);
      if (endDate) matchesDate = matchesDate && new Date(t.date) <= new Date(endDate);
      return matchesSearch && matchesType && matchesAsset && matchesDate;
    });
  }, [transactions, assets, searchTerm, typeFilter, assetFilter, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / itemsPerPage));
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const clearFilters = () => {
    setSearchTerm("");
    setTypeFilter("Tümü");
    setAssetFilter("Tümü");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/transactions/${id}`, undefined); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/details"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/allocation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/performance"] });
      toast({ title: "Başarılı", description: "İşlem silindi" });
    },
    onError: () => toast({ title: "Hata", description: "İşlem silinemedi", variant: "destructive" }),
  });

  const formatDate = (dateStr: string | Date) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-6">
      {/* TOP BAR */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#F0F2F7]" data-testid="heading-transactions">İşlemler</h1>
          <p className="text-sm text-[#8892A4]">Alım ve satım işlemlerinizi görüntüleyin</p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#00D4AA] rounded-lg text-sm font-medium text-[#080A0F] hover:bg-[#00D4AA]/90 transition-colors"
          data-testid="button-add-transaction"
        >
          <Plus className="w-4 h-4" />
          İşlem Ekle
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="finos-card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4E5A6B]" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                className="pl-10 pr-3 py-2 w-40 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] focus:outline-none focus:border-[#00D4AA] transition-colors"
              />
            </div>
            <span className="text-[#4E5A6B]">→</span>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4E5A6B]" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                className="pl-10 pr-3 py-2 w-40 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] focus:outline-none focus:border-[#00D4AA] transition-colors"
              />
            </div>
          </div>

          {/* Type Dropdown */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="appearance-none pl-3 pr-8 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] focus:outline-none focus:border-[#00D4AA] transition-colors cursor-pointer"
            >
              {typeOptions.map((opt) => (
                <option key={opt} value={opt}>{opt === "Tümü" ? "Tür" : opt}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4E5A6B] pointer-events-none" />
          </div>

          {/* Asset Dropdown */}
          <div className="relative">
            <select
              value={assetFilter}
              onChange={(e) => { setAssetFilter(e.target.value); setCurrentPage(1); }}
              className="appearance-none pl-3 pr-8 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] focus:outline-none focus:border-[#00D4AA] transition-colors cursor-pointer"
            >
              {assetOptions.map((opt) => (
                <option key={opt} value={opt}>{opt === "Tümü" ? "Varlık" : opt}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4E5A6B] pointer-events-none" />
          </div>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4E5A6B]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="GARAN, BTC, ETH ara..."
              className="w-full pl-10 pr-4 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] placeholder:text-[#4E5A6B] focus:outline-none focus:border-[#00D4AA] transition-colors"
              data-testid="input-transaction-search"
            />
          </div>

          {/* Filter Buttons */}
          <button className="px-4 py-2 bg-[#00D4AA] rounded-lg text-sm font-medium text-[#080A0F] hover:bg-[#00D4AA]/90 transition-colors">
            Filtrele
          </button>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-transparent border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#8892A4] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
          >
            Temizle
          </button>
        </div>
      </div>

      {/* ACTION BAR */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-[#F0F2F7]">İşlem Geçmişi</h2>
          <span className="px-2 py-0.5 bg-[rgba(0,212,170,0.15)] text-[#00D4AA] text-xs font-medium rounded-full">
            {filteredTransactions.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#4E5A6B]">Dışa Aktar:</span>
          <button
            onClick={() => exportTransactionsToPDF(filteredTransactions, assets || [])}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(255,71,87,0.15)] rounded-lg text-sm text-[#FF4757] hover:bg-[rgba(255,71,87,0.25)] transition-colors"
            data-testid="button-transactions-export-pdf"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={() => exportTransactionsToExcel(filteredTransactions, assets || [])}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(0,212,170,0.15)] rounded-lg text-sm text-[#00D4AA] hover:bg-[rgba(0,212,170,0.25)] transition-colors"
            data-testid="button-transactions-export-excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <div className="w-px h-6 bg-[rgba(255,255,255,0.06)]" />
          <button
            onClick={() => setShowOcrModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(255,184,51,0.15)] rounded-lg text-sm text-[#FFB833] hover:bg-[rgba(255,184,51,0.25)] transition-colors"
          >
            <Camera className="w-4 h-4" />
            Fiş Tara
          </button>
          <button
            onClick={() => setShowVoiceModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(167,139,250,0.15)] rounded-lg text-sm text-[#A78BFA] hover:bg-[rgba(167,139,250,0.25)] transition-colors"
          >
            <Mic className="w-4 h-4" />
            Sesli Gir
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="finos-card overflow-hidden mb-4">
        <div className="overflow-x-auto finos-scrollbar">
          {txLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((j) => (
                    <div key={j} className="h-4 bg-[#151A23] rounded animate-pulse flex-1" />
                  ))}
                </div>
              ))}
            </div>
          ) : txError ? (
            <div className="text-center py-12 text-[#FF4757] text-sm">İşlemler yüklenirken bir hata oluştu</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.06)]">
                  <th className="text-left p-4 text-xs font-medium text-[#4E5A6B] uppercase tracking-wider">Tarih</th>
                  <th className="text-left p-4 text-xs font-medium text-[#4E5A6B] uppercase tracking-wider">Varlık</th>
                  <th className="text-left p-4 text-xs font-medium text-[#4E5A6B] uppercase tracking-wider">Tür</th>
                  <th className="text-right p-4 text-xs font-medium text-[#4E5A6B] uppercase tracking-wider">Miktar</th>
                  <th className="text-right p-4 text-xs font-medium text-[#4E5A6B] uppercase tracking-wider">Fiyat</th>
                  <th className="text-right p-4 text-xs font-medium text-[#4E5A6B] uppercase tracking-wider">Toplam</th>
                  <th className="text-left p-4 text-xs font-medium text-[#4E5A6B] uppercase tracking-wider">Notlar</th>
                  <th className="text-center p-4 text-xs font-medium text-[#4E5A6B] uppercase tracking-wider">Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.length > 0 ? (
                  paginatedTransactions.map((t) => {
                    const asset = assets?.find((a) => a.id === t.assetId);
                    const typeInfo = typeConfig[t.type] || typeConfig["alış"];
                    return (
                      <tr
                        key={t.id}
                        className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                        data-testid={`transaction-row-${t.id}`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-[#4E5A6B]" />
                            <span className="text-sm text-[#8892A4]">{formatDate(t.date)}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#151A23] flex items-center justify-center">
                              <span className="text-xs font-bold text-[#F0F2F7]">
                                {(asset?.symbol || "??").slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-[#F0F2F7]">{asset?.symbol || "?"}</span>
                              <span className="text-xs text-[#4E5A6B] ml-1">— {asset?.name || t.assetId}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span
                            className="px-2.5 py-1 text-xs font-medium rounded-md"
                            style={{ color: typeInfo.color, backgroundColor: typeInfo.bg }}
                          >
                            {typeInfo.label}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-sm font-mono text-[#F0F2F7]">
                            {Number(t.quantity).toLocaleString("tr-TR", { maximumFractionDigits: 8 })}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-sm font-mono text-[#8892A4]">
                            {fmtCurrency(Number(t.price), t.currency)}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-sm font-mono font-medium" style={{ color: typeInfo.color }}>
                            {t.type === "satış" ? "-" : "+"}{fmtCurrency(Math.abs(Number(t.totalAmount)), t.currency)}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-[#8892A4]">{t.notes || "—"}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setEditTransaction(t)}
                              className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors group"
                              data-testid={`button-edit-transaction-${t.id}`}
                            >
                              <Pencil className="w-4 h-4 text-[#4E5A6B] group-hover:text-[#F0F2F7]" />
                            </button>
                            <button
                              onClick={() => deleteMutation.mutate(t.id)}
                              disabled={deleteMutation.isPending}
                              className="p-1.5 rounded-lg hover:bg-[rgba(255,71,87,0.1)] transition-colors group"
                              data-testid={`button-delete-transaction-${t.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-[#4E5A6B] group-hover:text-[#FF4757]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-sm text-[#4E5A6B]">
                      Filtrelere uygun işlem bulunamadı
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* PAGINATION */}
      {filteredTransactions.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#8892A4]">
            {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredTransactions.length)} / {filteredTransactions.length} kayıt
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-[#151A23] border border-[rgba(255,255,255,0.06)] text-[#8892A4] hover:bg-[rgba(255,255,255,0.04)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-[#8892A4] px-2">{currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-[#151A23] border border-[rgba(255,255,255,0.06)] text-[#8892A4] hover:bg-[rgba(255,255,255,0.04)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* OCR MODAL */}
      {showOcrModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="finos-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-[#F0F2F7]">Fiş Tarama</h3>
              <button
                onClick={() => setShowOcrModal(false)}
                className="p-1 rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors"
              >
                <X className="w-5 h-5 text-[#8892A4]" />
              </button>
            </div>

            <div className="border-2 border-dashed border-[rgba(255,255,255,0.1)] rounded-xl p-8 flex flex-col items-center justify-center mb-4 hover:border-[#FFB833] transition-colors cursor-pointer"
              onClick={() => toast({ title: "Bilgi", description: "Dosya seçme penceresi açılacak (demo)" })}
            >
              <div className="w-16 h-16 rounded-full bg-[rgba(255,184,51,0.15)] flex items-center justify-center mb-4">
                <Camera className="w-8 h-8 text-[#FFB833]" />
              </div>
              <p className="text-sm text-[#F0F2F7] mb-1">Fotoğraf çek veya yükle</p>
              <p className="text-xs text-[#4E5A6B]">PNG, JPG, PDF desteklenir</p>
            </div>

            <p className="text-xs text-[#8892A4] text-center mb-6">
              Yapay zeka fişi okuyarak işlemi otomatik ekler
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowOcrModal(false)}
                className="flex-1 px-4 py-2.5 bg-transparent border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#8892A4] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  toast({ title: "Bilgi", description: "OCR tarama başlatıldı (demo özellik)" });
                  setShowOcrModal(false);
                }}
                className="flex-1 px-4 py-2.5 bg-[#FFB833] rounded-lg text-sm font-medium text-[#080A0F] hover:bg-[#FFB833]/90 transition-colors"
              >
                Tara
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VOICE INPUT MODAL */}
      {showVoiceModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="finos-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-[#F0F2F7]">Sesli Giriş</h3>
              <button
                onClick={() => { setShowVoiceModal(false); setIsRecording(false); }}
                className="p-1 rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors"
              >
                <X className="w-5 h-5 text-[#8892A4]" />
              </button>
            </div>

            <div className="flex flex-col items-center mb-6">
              <div className="flex items-center gap-1 h-16 mb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`w-2 bg-[#A78BFA] rounded-full transition-all duration-150 ${isRecording ? "animate-pulse" : ""}`}
                    style={{
                      height: isRecording ? `${20 + Math.random() * 40}px` : "8px",
                      animationDelay: `${i * 100}ms`,
                    }}
                  />
                ))}
              </div>

              <p className="text-sm text-[#F0F2F7] mb-2">
                {isRecording ? "Dinleniyor..." : "Konuşun..."}
              </p>
              <p className="text-xs text-[#4E5A6B]">
                Örnek: &quot;Bugün Migros&apos;ta 340 TL harcadım&quot;
              </p>
            </div>

            <div className="bg-[#151A23] rounded-lg p-4 min-h-[80px] mb-6">
              {isRecording ? (
                <p className="text-sm text-[#8892A4] animate-pulse">Ses algılanıyor...</p>
              ) : (
                <p className="text-sm text-[#4E5A6B]">Transcript burada görünecek</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => { setShowVoiceModal(false); setIsRecording(false); }}
                className="flex-1 px-4 py-2.5 bg-transparent border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#8892A4] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  if (isRecording) {
                    toast({ title: "Bilgi", description: "Sesli giriş tamamlandı (demo özellik)" });
                    setIsRecording(false);
                    setShowVoiceModal(false);
                  } else {
                    setIsRecording(true);
                  }
                }}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isRecording
                    ? "bg-[#FF4757] text-white hover:bg-[#FF4757]/90"
                    : "bg-[#A78BFA] text-[#080A0F] hover:bg-[#A78BFA]/90"
                }`}
              >
                {isRecording ? "Durdur" : "Başla"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AddTransactionDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
      <EditTransactionDialog transaction={editTransaction} open={editTransaction !== null} onOpenChange={(open) => { if (!open) setEditTransaction(null); }} />
    </div>
  );
}
