import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertAssetSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { AssetDetail } from "@shared/schema";
import { z } from "zod";
import { useEffect } from "react";

const editAssetSchema = insertAssetSchema.partial();
type EditAsset = z.infer<typeof editAssetSchema>;

interface EditAssetDialogProps {
  asset: AssetDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditAssetDialog({ asset, open, onOpenChange }: EditAssetDialogProps) {
  const { toast } = useToast();

  const form = useForm<EditAsset>({
    resolver: zodResolver(editAssetSchema),
    defaultValues: {
      type: "hisse",
      name: "",
      symbol: "",
      market: "BIST",
      quantity: "0",
      averagePrice: "0",
      currentPrice: "0",
      currency: "TRY",
    },
  });

  useEffect(() => {
    if (asset && open) {
      form.reset({
        type: asset.type as any,
        name: asset.name,
        symbol: asset.symbol,
        market: asset.market,
        quantity: String(asset.quantity),
        averagePrice: String(asset.averagePrice),
        currentPrice: String(asset.currentPrice),
        currency: asset.currency,
      });
    }
  }, [asset, open]);

  const selectedType = form.watch("type");

  const updateMutation = useMutation({
    mutationFn: async (data: EditAsset) => {
      return await apiRequest("PATCH", `/api/assets/${asset?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/allocation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/performance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/details"] });
      toast({ title: "Başarılı", description: "Varlık başarıyla güncellendi" });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Hata", description: "Varlık güncellenirken bir hata oluştu", variant: "destructive" });
    },
  });

  const onSubmit = (data: EditAsset) => {
    updateMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Varlığı Düzenle</DialogTitle>
              <DialogDescription>Varlık bilgilerini güncelleyin</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Varlık Türü</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="hisse">Hisse Senedi</SelectItem>
                          <SelectItem value="etf">ETF</SelectItem>
                          <SelectItem value="kripto">Kripto Para</SelectItem>
                          <SelectItem value="gayrimenkul">Gayrimenkul</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="market"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Borsa</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {selectedType === "kripto" ? (
                            <>
                              <SelectItem value="Binance">Binance</SelectItem>
                              <SelectItem value="Diğer">Diğer</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="BIST">Borsa İstanbul</SelectItem>
                              <SelectItem value="US">Amerikan Borsası</SelectItem>
                              <SelectItem value="Diğer">Diğer</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Varlık Adı</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
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
                        <Input type="number" step="0.00000001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Para Birimi</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="TRY">TRY (₺)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="averagePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ortalama Alış Fiyatı</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currentPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Güncel Fiyat</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
