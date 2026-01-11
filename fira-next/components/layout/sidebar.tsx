"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

// Type definitions
type Chat = {
  _id: Id<"chats">;
  ticker: string;
  createdAt: number;
};
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  TrendingUp,
  MessageSquare,
  Plus,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  FileText,
  LayoutDashboard,
} from "lucide-react";

interface SidebarProps {
  onNewChat: () => void;
}

export function Sidebar({ onNewChat }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();

  const currentUser = useQuery(api.users.getCurrentUser);
  const chats = useQuery(api.chats.getUserChats);

  const navItems = [
    {
      href: "/dashboard",
      icon: LayoutDashboard,
      label: "Dashboard",
    },
  ];

  const adminItems = currentUser?.isAdmin
    ? [
        {
          href: "/admin",
          icon: Shield,
          label: "Admin",
        },
      ]
    : [];

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "relative flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-gradient-green">Fira</span>
            </Link>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
          )}
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onNewChat}
                className={cn(
                  "w-full bg-primary hover:bg-primary/90 text-primary-foreground",
                  collapsed && "px-0"
                )}
              >
                <Plus className="w-4 h-4" />
                {!collapsed && <span className="ml-2">New Chat</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">New Chat</TooltipContent>}
          </Tooltip>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-2">
          {[...navItems, ...adminItems].map((item) => (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link href={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start mb-1",
                      pathname === item.href
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                      collapsed && "justify-center px-0"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {!collapsed && <span className="ml-2">{item.label}</span>}
                  </Button>
                </Link>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">{item.label}</TooltipContent>
              )}
            </Tooltip>
          ))}
        </nav>

        <Separator className="my-2" />

        {/* Chat History */}
        <div className="flex-1 overflow-hidden">
          {!collapsed && (
            <div className="px-4 py-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Recent Chats
              </h3>
            </div>
          )}
          <ScrollArea className="h-full px-3">
            {(chats as Chat[] | undefined)?.map((chat: Chat) => (
              <Tooltip key={chat._id}>
                <TooltipTrigger asChild>
                  <Link href={`/chat/${chat._id}`}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start mb-1 text-sm",
                        pathname === `/chat/${chat._id}`
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                        collapsed && "justify-center px-0"
                      )}
                    >
                      {collapsed ? (
                        <FileText className="w-4 h-4" />
                      ) : (
                        <>
                          <MessageSquare className="w-4 h-4 shrink-0" />
                          <span className="ml-2 truncate">
                            {chat.ticker} - {new Date(chat.createdAt).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </Button>
                  </Link>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">{chat.ticker}</TooltipContent>
                )}
              </Tooltip>
            ))}
          </ScrollArea>
        </div>

        {/* User Menu */}
        <div className="p-3 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start",
                  collapsed && "justify-center px-0"
                )}
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.imageUrl} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="ml-2 text-left overflow-hidden">
                    <p className="text-sm font-medium truncate">
                      {user?.firstName || user?.emailAddresses[0]?.emailAddress}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.emailAddresses[0]?.emailAddress}
                    </p>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut()}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-20 w-6 h-6 rounded-full border border-border bg-background shadow-md hover:bg-accent"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </Button>
      </div>
    </TooltipProvider>
  );
}
