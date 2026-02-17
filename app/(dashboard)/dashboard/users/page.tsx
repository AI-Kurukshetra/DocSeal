import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/actions";
import { getAllUsers } from "@/features/admin/actions";
import { UserTable } from "@/features/admin/components/user-table";

export default async function UsersPage() {
  const profile = await getCurrentUser();
  if (!profile || profile.role !== "admin") redirect("/dashboard");

  const users = await getAllUsers();
  return <UserTable users={users} />;
}
