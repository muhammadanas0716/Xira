"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  FileText,
  Calendar,
  TrendingUp,
  Loader2,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

interface FilingSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (chatId: string) => void;
}

interface Filing {
  ticker: string;
  formType: string;
  filingDate: string;
  accessionNumber: string;
  companyName?: string;
}

interface StockInfo {
  symbol: string;
  companyName: string;
  price?: number;
  change?: number;
  changePercent?: number;
}

export function FilingSelectorModal({
  open,
  onOpenChange,
  onSelect,
}: FilingSelectorModalProps) {
  const [ticker, setTicker] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [filings, setFilings] = useState<Filing[]>([]);
  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null);
  const [selectedFiling, setSelectedFiling] = useState<Filing | null>(null);
  const [creating, setCreating] = useState(false);

  const createChat = useMutation(api.chats.createChat);

  const searchFilings = async () => {
    if (!ticker.trim()) return;

    setSearchLoading(true);
    setFilings([]);
    setStockInfo(null);
    setSelectedFiling(null);

    try {
      // Fetch SEC filings
      const response = await fetch(`/api/sec/filings?ticker=${ticker.toUpperCase()}`);
      if (!response.ok) throw new Error("Failed to fetch filings");
      const data = await response.json();
      setFilings(data.filings || []);
      setStockInfo(data.stockInfo || null);
    } catch (error) {
      toast.error("Failed to search filings");
      console.error(error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleCreateChat = async () => {
    if (!selectedFiling) return;

    setCreating(true);
    try {
      // First, ensure the filing exists in Convex or create it
      const response = await fetch("/api/sec/ensure-filing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedFiling),
      });

      if (!response.ok) throw new Error("Failed to process filing");
      const { filingId } = await response.json();

      // Create the chat
      const chatId = await createChat({
        filingId,
        ticker: selectedFiling.ticker,
        stockInfo: stockInfo || undefined,
      });

      onSelect(chatId);
      toast.success("Chat created successfully");
    } catch (error) {
      toast.error("Failed to create chat");
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      searchFilings();
    }
  };

  const getFormTypeBadgeColor = (formType: string) => {
    switch (formType) {
      case "10-K":
        return "bg-primary/20 text-primary border-primary/30";
      case "10-Q":
        return "bg-finance-blue/20 text-finance-blue border-finance-blue/30";
      case "8-K":
        return "bg-finance-orange/20 text-finance-orange border-finance-orange/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl">Select SEC Filing</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Search for a company and select a filing to analyze
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Enter ticker symbol (e.g., AAPL)"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                className="pl-10 bg-input border-border"
              />
            </div>
            <Button
              onClick={searchFilings}
              disabled={searchLoading || !ticker.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              {searchLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Search"
              )}
            </Button>
          </div>

          {/* Stock Info Card */}
          {stockInfo && (
            <Card className="bg-secondary/50 border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{stockInfo.symbol}</h3>
                      <p className="text-sm text-muted-foreground">
                        {stockInfo.companyName}
                      </p>
                    </div>
                  </div>
                  {stockInfo.price !== undefined && (
                    <div className="text-right">
                      <p className="font-mono font-semibold">
                        ${stockInfo.price.toFixed(2)}
                      </p>
                      {stockInfo.change !== undefined && (
                        <p
                          className={`text-sm font-mono ${
                            stockInfo.change >= 0
                              ? "text-finance-green"
                              : "text-finance-red"
                          }`}
                        >
                          {stockInfo.change >= 0 ? "+" : ""}
                          {stockInfo.change.toFixed(2)} (
                          {stockInfo.changePercent?.toFixed(2)}%)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filings List */}
          {searchLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filings.length > 0 ? (
            <Tabs defaultValue="10-K" className="w-full">
              <TabsList className="w-full bg-secondary">
                <TabsTrigger value="10-K" className="flex-1">
                  10-K
                </TabsTrigger>
                <TabsTrigger value="10-Q" className="flex-1">
                  10-Q
                </TabsTrigger>
                <TabsTrigger value="8-K" className="flex-1">
                  8-K
                </TabsTrigger>
              </TabsList>
              {["10-K", "10-Q", "8-K"].map((formType) => (
                <TabsContent key={formType} value={formType}>
                  <ScrollArea className="h-64">
                    <div className="space-y-2 pr-4">
                      {filings
                        .filter((f) => f.formType === formType)
                        .map((filing) => (
                          <Card
                            key={filing.accessionNumber}
                            className={`cursor-pointer transition-all hover:border-primary/50 ${
                              selectedFiling?.accessionNumber ===
                              filing.accessionNumber
                                ? "border-primary bg-primary/5"
                                : "border-border"
                            }`}
                            onClick={() => setSelectedFiling(filing)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <FileText className="w-5 h-5 text-muted-foreground" />
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        variant="outline"
                                        className={getFormTypeBadgeColor(
                                          filing.formType
                                        )}
                                      >
                                        {filing.formType}
                                      </Badge>
                                      <span className="font-medium">
                                        {filing.ticker}
                                      </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {filing.companyName}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(filing.filingDate).toLocaleDateString()}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      {filings.filter((f) => f.formType === formType).length ===
                        0 && (
                        <p className="text-center text-muted-foreground py-8">
                          No {formType} filings found
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              ))}
            </Tabs>
          ) : ticker && !searchLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No filings found for "{ticker}"</p>
              <p className="text-sm">Try searching for another ticker symbol</p>
            </div>
          ) : null}

          {/* Action Button */}
          {selectedFiling && (
            <Button
              onClick={handleCreateChat}
              disabled={creating}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Chat...
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Analyze {selectedFiling.formType} Filing
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
