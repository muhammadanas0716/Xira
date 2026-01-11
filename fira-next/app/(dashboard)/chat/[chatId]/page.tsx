"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Type definitions
type Message = {
  _id: Id<"messages">;
  chatId: Id<"chats">;
  question: string;
  answer: string;
  isStreaming?: boolean;
  createdAt: number;
};
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Send,
  Bot,
  User,
  FileText,
  TrendingUp,
  TrendingDown,
  Loader2,
  Building2,
  Calendar,
  BarChart3,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function ChatPage() {
  const params = useParams();
  const chatId = params.chatId as Id<"chats">;

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const chat = useQuery(api.chats.getChat, { chatId });
  const messages = useQuery(api.messages.getChatMessages, { chatId });
  const createMessage = useMutation(api.messages.createMessage);
  const updateMessageAnswer = useMutation(api.messages.updateMessageAnswer);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const question = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      // Create message in Convex
      const messageId = await createMessage({
        chatId,
        question,
      });

      // Call RAG API for streaming response
      const response = await fetch("/api/chat/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          messageId,
          question,
          filingId: chat?.filingId,
          ticker: chat?.ticker,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullAnswer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          fullAnswer += chunk;

          // Update message with partial answer
          await updateMessageAnswer({
            messageId,
            answer: fullAnswer,
            isStreaming: true,
          });
        }

        // Final update with complete answer
        await updateMessageAnswer({
          messageId,
          answer: fullAnswer,
          isStreaming: false,
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (chat === undefined) {
    return (
      <div className="flex flex-col h-full p-6">
        <Skeleton className="h-24 w-full mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (chat === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Chat not found</p>
      </div>
    );
  }

  const stockInfo = chat.stockInfo as {
    symbol: string;
    companyName: string;
    price?: number;
    change?: number;
    changePercent?: number;
  } | null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border p-4 bg-card/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{chat.ticker}</h1>
                <Badge variant="outline" className="text-xs">
                  {chat.filing?.formType || "Filing"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {stockInfo?.companyName || chat.ticker}
              </p>
            </div>
          </div>

          {stockInfo?.price !== undefined && (
            <div className="text-right">
              <p className="text-xl font-mono font-bold">
                ${stockInfo.price.toFixed(2)}
              </p>
              {stockInfo.change !== undefined && (
                <div
                  className={`flex items-center gap-1 justify-end ${
                    stockInfo.change >= 0 ? "text-finance-green" : "text-finance-red"
                  }`}
                >
                  {stockInfo.change >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span className="font-mono text-sm">
                    {stockInfo.change >= 0 ? "+" : ""}
                    {stockInfo.change.toFixed(2)} ({stockInfo.changePercent?.toFixed(2)}%)
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filing Info */}
        {chat.filing && (
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              <span>{chat.filing.formType}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(chat.filing.filingDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <BarChart3 className="w-4 h-4" />
              <span>FY{chat.filing.fiscalYear}</span>
              {chat.filing.fiscalQuarter && <span>Q{chat.filing.fiscalQuarter}</span>}
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages === undefined ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="w-16 h-16 mx-auto mb-4 text-primary/50" />
              <h3 className="text-lg font-semibold mb-2">
                Start analyzing this filing
              </h3>
              <p className="text-muted-foreground mb-4">
                Ask questions about {chat.ticker}&apos;s {chat.filing?.formType || "SEC"} filing
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  "What are the key risk factors?",
                  "Summarize the financial highlights",
                  "What is the company's competitive advantage?",
                  "Any significant changes from last year?",
                ].map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setInput(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            (messages as Message[]).map((message: Message) => (
              <div key={message._id} className="space-y-4">
                {/* User Question */}
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className="bg-primary/20 text-primary text-sm">
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 bg-secondary/50 rounded-lg p-4">
                    <p className="text-sm">{message.question}</p>
                  </div>
                </div>

                {/* AI Answer */}
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      <Bot className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 bg-card rounded-lg p-4 border border-border">
                    {message.isStreaming && !message.answer ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Analyzing filing...</span>
                      </div>
                    ) : (
                      <div className="prose prose-sm prose-invert max-w-none">
                        <ReactMarkdown>{message.answer}</ReactMarkdown>
                      </div>
                    )}
                    {message.isStreaming && message.answer && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Streaming...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-4 bg-card/50">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask about ${chat.ticker}'s filing...`}
              className="flex-1 bg-input border-border"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
