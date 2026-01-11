"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { FilingSelectorModal } from "@/components/layout/filing-selector-modal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showFilingSelector, setShowFilingSelector] = useState(false);
  const router = useRouter();

  const handleNewChat = () => {
    setShowFilingSelector(true);
  };

  const handleFilingSelect = (chatId: string) => {
    setShowFilingSelector(false);
    router.push(`/chat/${chatId}`);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar onNewChat={handleNewChat} />
      <main className="flex-1 overflow-auto">{children}</main>
      <FilingSelectorModal
        open={showFilingSelector}
        onOpenChange={setShowFilingSelector}
        onSelect={handleFilingSelect}
      />
    </div>
  );
}
