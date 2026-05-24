import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertTransactionSchema, type InsertTransaction, type Asset } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTransactionDialog({ open, onOpenChange }: AddTransactionDialogProps) {
  const { toast } = useToast();
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);

  const { data: assets } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const form = useForm<InsertTransaction>({
    resolver: zodResolver(insertTransactionSchema),
    defaultValues: {
      assetId: "",
      type: "alış",
      quantity: "0",
      price: "0",
      totalAmount: "0",
      currency: "TRY",
      notes: "",
      date: new Date().toISOString().split("T")[0] + "T12:00:00.000Z",
    },
  });

  const quantity = form.watch("quantity");
  const price = form.watch("price");
  const selectedAssetId = form.watch("assetId");

  useEffect(() => {
    const q = parseFloat(quantity) || 0;
    const p = parseFloat(price) || 0;
    form.setValue("totalAmount", (q * p).toString());
  }, [quantity, price, form]);

  const fetchCurrentPrice = async () => {
    if (!selectedAssetId) {
      toast({ title: "Uyarı", description: "Lütfen önce bir varlık seçiniz", variant: "destructive" });
      return;
    }
    const selectedAsset = assets?.find(a => a.id === selectedAssetId);
    if (!selectedAsset) return;

    setIsFetchingPrice(true);
    try {
      const response = await fetch(`/api/prices/${selectedAsset.symbol}?type=${selectedAsset.type}&market=${selectedAsset.market}`);
      if (response.ok) {
        const data = await response.json();
        form.setValue("price", data.price.toFixed(8));
        toast({
          title: "Fiyat Güncellendi",
          description: `${selectedAsset.symbol} güncel fiyatı: ${data.price.toFixed(2)} ${selectedAsset.currency}`,
        });
      } else {
        toast({ title: "Fiyat Bulunamadı", description: "Bu sembol için güncel fiyat alınamadı", variant: "destructive" });
      }
    } catch {
      toast({ title: "Hata", description: "Fiyat bilgisi alınırken bir hata oluştu", variant: "destructive" });
    } finally {
      setIsFetchingPrice(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: InsertTransaction) => {
      return await apiRequest("POST", "/api/transactions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/allocation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/performance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/details"] });
      toast({ title: "Başarılı", description: "İşlem başarıyla eklendi" });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error?.message || "İşlem eklenirken bir hata oluştu", variant: "destructive" });
    },
  });

  const handleAssetChange = (assetId: string) => {
    const selectedAsset = assets?.find(a => a.id === assetId);
    if (selectedAsset) {
      form.setValue("currency", selectedAsset.currency);
      form.setValue("price", Number(selectedAsset.currentPrice).toFixed(8));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]" data-testid="dialog-add-transaction">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(data => createMutation.mutate(data))}>
            <DialogHeader>
              <DialogTitle>Yeni İşlem Ekle</DialogTitle>
              <DialogDescription>Alım veya satım işlemi kaydedin</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="assetId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Varlık</FormLabel>
                    <Select
                      onValueChange={v => { field.onChange(v); handleAssetChange(v); }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-asset">
                          <SelectValue placeholder="Varlık seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assets?.map(asset => (
                          <SelectItem key={asset.id} value={asset.id}>
                            {asset.name} ({asset.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>İşlem Türü</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-transaction-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="alış">Alış</SelectItem>
                        <SelectItem value="satış">Satış</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Miktar</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.00000001" placeholder="0" {...field} data-testid="input-transaction-quantity" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fiyat</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input type="number" step="0.00000001" placeholder="0.00" {...field} data-testid="input-transaction-price" />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={fetchCurrentPrice}
                          disabled={isFetchingPrice || !selectedAssetId}
                          title="Güncel fiyatı API'den çek"
                          data-testid="button-fetch-price"
                          className="flex-shrink-0"
                        >
                          <RefreshCw className={`h-4 w-4 ${isFetchingPrice ? "animate-spin" : ""}`} />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Toplam Tutar</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        readOnly
                        className="bg-muted"
                        data-testid="input-total-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>İşlem Tarihi</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value.split("T")[0]}
                        onChange={e => field.onChange(e.target.value + "T12:00:00.000Z")}
                        data-testid="input-transaction-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notlar (Opsiyonel)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="İşlem hakkında notlar..."
                        {...field}
                        value={field.value || ""}
                        data-testid="textarea-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
                İptal
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
                {createMutation.isPending ? "Ekleniyor..." : "İşlem Ekle"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
