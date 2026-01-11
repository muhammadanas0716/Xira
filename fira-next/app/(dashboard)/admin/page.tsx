"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Type definitions for Convex data
type User = {
  _id: Id<"users">;
  email: string;
  name?: string;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: number;
};

type InviteCode = {
  _id: Id<"inviteCodes">;
  code: string;
  maxUses: number;
  usesCount: number;
  isActive: boolean;
  createdAt: number;
};
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  MessageSquare,
  FileText,
  Key,
  Plus,
  Shield,
  ShieldOff,
  UserX,
  UserCheck,
  Copy,
  TrendingUp,
  Activity,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminPage() {
  const [newCodeMaxUses, setNewCodeMaxUses] = useState("10");
  const [showCreateCode, setShowCreateCode] = useState(false);

  const currentUser = useQuery(api.users.getCurrentUser);
  const users = useQuery(api.users.getAllUsers);
  const chatStats = useQuery(api.chats.getChatStats);
  const messageStats = useQuery(api.messages.getMessageStats);
  const filingStats = useQuery(api.filings.getFilingStats);
  const inviteCodes = useQuery(api.inviteCodes.getAllInviteCodes);

  const toggleUserActive = useMutation(api.users.toggleUserActive);
  const toggleUserAdmin = useMutation(api.users.toggleUserAdmin);
  const createInviteCode = useMutation(api.inviteCodes.createInviteCode);
  const toggleInviteCode = useMutation(api.inviteCodes.toggleInviteCode);

  // Check if user is admin
  if (currentUser === undefined) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!currentUser?.isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            You don&apos;t have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  const handleCreateCode = async () => {
    try {
      const code = await createInviteCode({
        maxUses: parseInt(newCodeMaxUses) || 10,
      });
      toast.success(`Invite code created: ${code}`);
      setShowCreateCode(false);
      setNewCodeMaxUses("10");
    } catch (error) {
      toast.error("Failed to create invite code");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="min-h-screen bg-background p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="w-8 h-8 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage users, invite codes, and monitor system activity
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-3xl font-bold mt-1">
                    {users?.length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Chats</p>
                  <p className="text-3xl font-bold mt-1">
                    {chatStats?.total || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    +{chatStats?.today || 0} today
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-finance-blue/10 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-finance-blue" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Messages</p>
                  <p className="text-3xl font-bold mt-1">
                    {messageStats?.total || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    +{messageStats?.today || 0} today
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-finance-orange/10 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-finance-orange" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Filings</p>
                  <p className="text-3xl font-bold mt-1">
                    {filingStats?.total || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {filingStats?.embedded || 0} embedded
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-chart-3/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-chart-3" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="bg-secondary">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="invites">Invite Codes</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead>Email</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(users as User[] | undefined)?.map((user: User) => (
                        <TableRow key={user._id} className="border-border">
                          <TableCell className="font-mono text-sm">
                            {user.email}
                          </TableCell>
                          <TableCell>{user.name || "-"}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                user.isActive
                                  ? "bg-finance-green/10 text-finance-green border-finance-green/30"
                                  : "bg-finance-red/10 text-finance-red border-finance-red/30"
                              }
                            >
                              {user.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                user.isAdmin
                                  ? "bg-primary/10 text-primary border-primary/30"
                                  : ""
                              }
                            >
                              {user.isAdmin ? "Admin" : "User"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  toggleUserActive({ userId: user._id })
                                }
                                title={
                                  user.isActive
                                    ? "Deactivate user"
                                    : "Activate user"
                                }
                              >
                                {user.isActive ? (
                                  <UserX className="w-4 h-4 text-finance-red" />
                                ) : (
                                  <UserCheck className="w-4 h-4 text-finance-green" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  toggleUserAdmin({ userId: user._id })
                                }
                                title={
                                  user.isAdmin
                                    ? "Remove admin"
                                    : "Make admin"
                                }
                              >
                                {user.isAdmin ? (
                                  <ShieldOff className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <Shield className="w-4 h-4 text-primary" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invite Codes Tab */}
          <TabsContent value="invites">
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Invite Codes</CardTitle>
                <Dialog open={showCreateCode} onOpenChange={setShowCreateCode}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Code
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border">
                    <DialogHeader>
                      <DialogTitle>Create Invite Code</DialogTitle>
                      <DialogDescription>
                        Generate a new invite code for user registration
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Max Uses</label>
                        <Input
                          type="number"
                          value={newCodeMaxUses}
                          onChange={(e) => setNewCodeMaxUses(e.target.value)}
                          className="bg-input border-border"
                          min="1"
                        />
                      </div>
                      <Button
                        onClick={handleCreateCode}
                        className="w-full bg-primary hover:bg-primary/90"
                      >
                        Generate Code
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead>Code</TableHead>
                        <TableHead>Uses</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(inviteCodes as InviteCode[] | undefined)?.map((code: InviteCode) => (
                        <TableRow key={code._id} className="border-border">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="font-mono text-sm bg-secondary px-2 py-1 rounded">
                                {code.code}
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(code.code)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            {code.usesCount} / {code.maxUses}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                code.isActive
                                  ? "bg-finance-green/10 text-finance-green border-finance-green/30"
                                  : "bg-finance-red/10 text-finance-red border-finance-red/30"
                              }
                            >
                              {code.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(code.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                toggleInviteCode({ codeId: code._id })
                              }
                            >
                              {code.isActive ? "Disable" : "Enable"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
