import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Transaction } from "@shared/schema";
import { EditTransactionDialog } from "./edit-transaction-dialog";

interface TransactionTableProps {
  transactions: Transaction[];
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  const { toast } = useToast();
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/transactions/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/details"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/allocation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/performance"] });
      toast({
        title: "Başarılı",
        description: "İşlem başarıyla silindi",
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "İşlem silinirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: number, currency: string) => {
    const symbols: Record<string, string> = {
      TRY: "₺",
      USD: "$",
      EUR: "€",
    };
    return `${symbols[currency] || ""}${amount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground" data-testid="empty-transactions">
        <p>Henüz işlem kaydı bulunmuyor</p>
        <p className="text-sm mt-1">İşlem eklemek için yukarıdaki butonu kullanın</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarih</TableHead>
              <TableHead>Varlık ID</TableHead>
              <TableHead>Tür</TableHead>
              <TableHead className="text-right">Miktar</TableHead>
              <TableHead className="text-right">Fiyat</TableHead>
              <TableHead className="text-right">Toplam</TableHead>
              <TableHead>Notlar</TableHead>
              <TableHead className="w-[90px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id} data-testid={`transaction-row-${transaction.id}`}>
                <TableCell>
                  {format(new Date(transaction.date), "d MMM yyyy", { locale: tr })}
                </TableCell>
                <TableCell className="font-mono text-xs">{transaction.assetId.slice(0, 8)}...</TableCell>
                <TableCell>
                  <Badge
                    variant={transaction.type === "alış" ? "default" : "secondary"}
                    data-testid={`badge-${transaction.type}`}
                  >
                    {transaction.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {Number(transaction.quantity).toLocaleString("tr-TR", { maximumFractionDigits: 8 })}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(Number(transaction.price), transaction.currency)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(Number(transaction.totalAmount), transaction.currency)}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {transaction.notes || "-"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditTransaction(transaction)}
                      data-testid={`button-edit-transaction-${transaction.id}`}
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(transaction.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-transaction-${transaction.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EditTransactionDialog
        transaction={editTransaction}
        open={editTransaction !== null}
        onOpenChange={(open) => { if (!open) setEditTransaction(null); }}
      />
    </>
  );
}
