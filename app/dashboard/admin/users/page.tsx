"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Trash2,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { UserRole } from "@/lib/definitions";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useDebounce } from "@/hooks/useDebounce";

type User = {
  id: string;
  name: string | null;
  email: string;
  username: string | null;
  image: string | null;
  role: string;
  verified: boolean;
  createdAt: string;
  isPrivate: boolean;
  _count: {
    posts: number;
    followers: number;
    following: number;
  };
  status: string;
};

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isSearching, setIsSearching] = useState(false);

  const isMasterAdmin = session?.user?.role === "MASTER_ADMIN";
  const debouncedSearch = useDebounce(search, 500);

  async function fetchUsers(searchTerm: string, role: string, currentPage: number) {
    try {
      if (!session?.user) return; // Don't fetch if no session
      
      setIsSearching(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        ...(searchTerm && { search: searchTerm }),
        ...(role && role !== "ALL" && { role }),
      });

      const response = await fetch("/api/admin/users?" + params.toString());
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setTotalPages(data.pages);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setIsSearching(false);
      setLoading(false); // Set loading to false after first fetch
    }
  }

  // Initial fetch when component mounts
  useEffect(() => {
    if (session?.user) {
      fetchUsers("", "", 1);
    }
  }, [session]);

  // Effect to trigger search
  useEffect(() => {
    if (!loading) { // Only trigger search if initial loading is done
      fetchUsers(debouncedSearch, roleFilter, page);
    }
  }, [debouncedSearch, roleFilter, page]);

  async function handleUserAction(userId: string, action: string, newRole?: UserRole) {
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, newRole }),
      });

      if (response.ok) {
        toast.success("User successfully " + action + "ed");
        fetchUsers(search, roleFilter, page);
      } else {
        const error = await response.text();
        throw new Error(error);
      }
    } catch (error) {
      console.error("Error " + action + "ing user:", error);
      toast.error("Failed to " + action + " user");
    }
  }

  async function banUser(userId: string) {
    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: "POST",
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }

      // Check if the response has the ban header
      const isUserBanned = res.headers.get('X-User-Banned') === 'true';
      
      if (isUserBanned) {
        // If the banned user is the current user, force logout
        if (session?.user?.id === userId) {
          await signOut({ callbackUrl: '/' });
        }
      }

      toast.success("User banned successfully");
      // Refresh the page to update the user list
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Failed to ban user");
    }
  }

  async function unbanUser(userId: string) {
    try {
      const res = await fetch(`/api/admin/users/${userId}/unban`, {
        method: "POST",
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }

      toast.success("User unbanned successfully");
      // Refresh the page to update the user list
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Failed to unban user");
    }
  }

  async function demoteUser(userId: string, targetRole: "USER" | "MODERATOR") {
    try {
      const res = await fetch(`/api/admin/users/${userId}/demote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetRole }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }

      toast.success(`User demoted to ${targetRole} successfully`);
      // Refresh the users list
      fetchUsers(search, roleFilter, page);
    } catch (error: any) {
      toast.error(error.message || "Failed to demote user");
    }
  }

  const roleIcon = {
    USER: <Shield className="h-4 w-4" />,
    MODERATOR: <ShieldCheck className="h-4 w-4 text-blue-500" />,
    ADMIN: <ShieldAlert className="h-4 w-4 text-yellow-500" />,
    MASTER_ADMIN: <ShieldAlert className="h-4 w-4 text-red-500" />,
  };

  if (!session?.user) {
    return null; // or some loading state
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <h3 className="text-xl font-semibold">Loading users...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1); // Reset to first page when searching
              }}
              className="w-[200px] pr-8"
            />
            {isSearching && (
              <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <Select value={roleFilter} onValueChange={(value) => {
            setRoleFilter(value);
            setPage(1); // Reset to first page when filtering
          }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All roles</SelectItem>
              <SelectItem value="USER">User</SelectItem>
              <SelectItem value="MODERATOR">Moderator</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
              {isMasterAdmin && (
                <SelectItem value="MASTER_ADMIN">Master Admin</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Posts</TableHead>
              <TableHead>Followers</TableHead>
              <TableHead>Following</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center space-x-2">
                    <Avatar>
                      <AvatarImage src={user.image || undefined} />
                      <AvatarFallback>
                        {user.name?.[0] || user.username?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <Link href={`/dashboard/${user.username}`} className="hover:underline">
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.username}
                        </div>
                      </div>
                    </Link>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {roleIcon[user.role as keyof typeof roleIcon]}
                    {user.role}
                  </div>
                </TableCell>
                <TableCell>{user._count.posts}</TableCell>
                <TableCell>{user._count.followers}</TableCell>
                <TableCell>{user._count.following}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant={user.status === "BANNED" ? "destructive" : "secondary"}>
                      {user.status === "BANNED" ? "Banned" : "Normal"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  {user.role !== "MASTER_ADMIN" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {user.status !== "BANNED" ? (
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => banUser(user.id)}
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            Ban User
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="text-green-600"
                            onClick={() => unbanUser(user.id)}
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            Unban User
                          </DropdownMenuItem>
                        )}
                        {isMasterAdmin && (
                          <>
                            {user.role === "USER" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleUserAction(user.id, "promote", "MODERATOR" as UserRole)
                                  }
                                >
                                  <ShieldCheck className="mr-2 h-4 w-4 text-blue-500" />
                                  Promote to Moderator
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleUserAction(user.id, "promote", "ADMIN" as UserRole)
                                  }
                                >
                                  <ShieldAlert className="mr-2 h-4 w-4 text-yellow-500" />
                                  Promote to Admin
                                </DropdownMenuItem>
                              </>
                            )}
                            {user.role === "MODERATOR" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleUserAction(user.id, "promote", "ADMIN" as UserRole)
                                }
                              >
                                <ShieldAlert className="mr-2 h-4 w-4 text-yellow-500" />
                                Promote to Admin
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                        {user.role === "ADMIN" && (
                          <>
                            <DropdownMenuItem
                              className="text-yellow-600"
                              onClick={() => demoteUser(user.id, "MODERATOR")}
                            >
                              <ShieldCheck className="mr-2 h-4 w-4 text-blue-500" />
                              Demote to Moderator
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-yellow-600"
                              onClick={() => demoteUser(user.id, "USER")}
                            >
                              <ShieldX className="mr-2 h-4 w-4" />
                              Demote to User
                            </DropdownMenuItem>
                          </>
                        )}
                        {user.role === "MODERATOR" && (
                          <DropdownMenuItem
                            className="text-yellow-600"
                            onClick={() => demoteUser(user.id, "USER")}
                          >
                            <ShieldX className="mr-2 h-4 w-4" />
                            Demote to User
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm">
          Page {page} of {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
} 