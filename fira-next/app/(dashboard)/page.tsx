"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Type definitions
type Chat = {
  _id: Id<"chats">;
  ticker: string;
  filingId: Id<"filings">;
  createdAt: number;
};
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  MessageSquare,
  FileText,
  TrendingUp,
  Clock,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function DashboardPage() {
  const user = useQuery(api.users.getCurrentUser);
  const chats = useQuery(api.chats.getUserChats);

  const recentChats = chats?.slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-background p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back
            {user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-muted-foreground">
            Analyze SEC filings with AI-powered insights
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Chats</p>
                  <p className="text-2xl font-bold mt-1">
                    {chats === undefined ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      chats.length
                    )}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Filings Analyzed</p>
                  <p className="text-2xl font-bold mt-1">
                    {chats === undefined ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      new Set(chats.map((c) => c.filingId)).size
                    )}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-finance-blue/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-finance-blue" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Companies</p>
                  <p className="text-2xl font-bold mt-1">
                    {chats === undefined ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      new Set(chats.map((c) => c.ticker)).size
                    )}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-finance-orange/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-finance-orange" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Chats */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">
                Recent Chats
              </CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {chats === undefined ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : recentChats.length > 0 ? (
                <div className="space-y-3">
                  {recentChats.map((chat) => (
                    <Link key={chat._id} href={`/chat/${chat._id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{chat.ticker}</span>
                              <Badge
                                variant="outline"
                                className="text-xs border-border"
                              >
                                {new Date(chat.createdAt).toLocaleDateString()}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              SEC Filing Analysis
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No chats yet</p>
                  <p className="text-sm text-muted-foreground">
                    Create a new chat to get started
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Start */}
          <Card className="bg-gradient-to-br from-primary/10 via-card to-finance-blue/10 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Quick Start
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Get started by analyzing an SEC filing. Our AI will help you
                extract key insights from 10-K, 10-Q, and 8-K filings.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-medium">
                    1
                  </div>
                  <span className="text-muted-foreground">
                    Click "New Chat" in the sidebar
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-medium">
                    2
                  </div>
                  <span className="text-muted-foreground">
                    Search for a company by ticker symbol
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-medium">
                    3
                  </div>
                  <span className="text-muted-foreground">
                    Select a filing and start asking questions
                  </span>
                </div>
              </div>
              <div className="pt-4">
                <p className="text-sm font-medium mb-2">Popular tickers:</p>
                <div className="flex flex-wrap gap-2">
                  {["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA"].map(
                    (ticker) => (
                      <Badge
                        key={ticker}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10 hover:border-primary/50 transition-colors"
                      >
                        {ticker}
                      </Badge>
                    )
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
