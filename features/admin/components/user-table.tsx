"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials, formatDate } from "@/lib/utils";
import { changeUserRole } from "../actions";
import type { Profile, UserRole } from "@/types";

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-purple-100 text-purple-700",
  sender: "bg-blue-100 text-blue-700",
  recipient: "bg-green-100 text-green-700",
};

export function UserTable({ users }: { users: Profile[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleRoleChange(userId: string, newRole: UserRole) {
    startTransition(async () => {
      const result = await changeUserRole(userId, newRole);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Role updated");
        router.refresh();
      }
    });
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary-50 text-primary text-xs">
                      {getInitials(user.full_name || user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{user.full_name || "—"}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {user.email}
              </TableCell>
              <TableCell>
                <Select
                  value={user.role}
                  onValueChange={(v) => handleRoleChange(user.id, v as UserRole)}
                  disabled={isPending}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue>
                      <Badge
                        className={ROLE_COLORS[user.role]}
                        variant="secondary"
                      >
                        {user.role}
                      </Badge>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sender">Sender</SelectItem>
                    <SelectItem value="recipient">Recipient</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(user.created_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
