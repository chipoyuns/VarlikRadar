import { useQuery } from "@tanstack/react-query";
import { Plus, FileText, FileSpreadsheet, ArrowUpRight, ArrowDownRight, Search } from "lucide-react";
import { useState } from "react";
import { AddTransactionDialog } from "@/components/add-transaction-dialog";
import { TransactionTable } from "@/components/transaction-table";
import { exportTransactionsToPDF, exportTransactionsToExcel } from "@/lib/export-utils";
import type { Asset, Transaction } from "@shared/schema";

export default function Transactions() {
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: transactions, isLoading, error } = useQuery<Transaction[]>({ queryKey: ["/api/transactions"] });
  const { data: assets } = useQuery<Asset[]>({ queryKey: ["/api/assets"] });

  const filteredTransactions = (transactions || []).filter((transaction) => {
    if (!searchTerm.trim()) return true;
    const asset = assets?.find((item) => item.id === transaction.assetId);
    const haystack = [transaction.assetId, asset?.name, asset?.symbol, asset?.market, transaction.type, transaction.notes]
      .filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(searchTerm.toLowerCase());
  });

  const totalBuy = (transactions || []).filter(t => t.type === "buy").length;
  const totalSell = (transactions || []).filter(t => t.type === "sell").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#F0F2F7]" data-testid="heading-transactions">İşlemler</h1>
          <p className="text-sm text-[#8892A4] mt-1">Alım ve satım işlemlerinizi görüntüleyin</p>
        </div>
        <button
          onClick={() => setIsAddTransactionOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#00D4AA] rounded-lg text-sm font-medium text-[#080A0F] hover:bg-[#00D4AA]/90 transition-colors"
          data-testid="button-add-transaction"
        >
          <Plus className="h-4 w-4" />
          İşlem Ekle
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="finos-card p-4">
          <p className="text-xs text-[#8892A4] mb-1">Toplam İşlem</p>
          <p className="text-2xl font-bold font-mono text-[#F0F2F7]">{(transactions || []).length}</p>
        </div>
        <div className="finos-card p-4">
          <p className="text-xs text-[#8892A4] mb-1 flex items-center gap-1">
            <ArrowUpRight className="h-3 w-3 text-[#00D4AA]" /> Alım
          </p>
          <p className="text-2xl font-bold font-mono text-[#00D4AA]">{totalBuy}</p>
        </div>
        <div className="finos-card p-4">
          <p className="text-xs text-[#8892A4] mb-1 flex items-center gap-1">
            <ArrowDownRight className="h-3 w-3 text-[#FF4757]" /> Satım
          </p>
          <p className="text-2xl font-bold font-mono text-[#FF4757]">{totalSell}</p>
        </div>
      </div>

      {/* Table Card */}
      <div className="finos-card p-5" data-testid="card-transaction-history">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
          <h3 className="text-sm font-semibold text-[#F0F2F7]">İşlem Geçmişi</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4E5A6B]" />
              <input
                placeholder="GARAN, BTC, ETH ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] placeholder:text-[#4E5A6B] focus:outline-none focus:border-[#00D4AA] transition-colors w-48"
                data-testid="input-transaction-search"
              />
            </div>
            {(transactions || []).length > 0 && (
              <>
                <button onClick={() => exportTransactionsToPDF(filteredTransactions, assets || [])} className="flex items-center gap-1.5 px-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-xs text-[#8892A4] hover:text-[#F0F2F7] transition-colors" data-testid="button-transactions-export-pdf">
                  <FileText className="h-3.5 w-3.5" /> PDF
                </button>
                <button onClick={() => exportTransactionsToExcel(filteredTransactions, assets || [])} className="flex items-center gap-1.5 px-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-xs text-[#8892A4] hover:text-[#F0F2F7] transition-colors" data-testid="button-transactions-export-excel">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
                </button>
              </>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-12 skeleton-shimmer" />)}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-[#FF4757] text-sm">İşlemler yüklenirken bir hata oluştu</div>
        ) : (
          <TransactionTable transactions={filteredTransactions} assets={assets || []} />
        )}
      </div>

      <AddTransactionDialog open={isAddTransactionOpen} onOpenChange={setIsAddTransactionOpen} />
    </div>
  );
}
