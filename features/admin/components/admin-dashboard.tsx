import type { ElementType } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, FileText, Clock, CheckCircle2, TrendingUp } from "lucide-react";
import { getAdminStats } from "../actions";

export async function AdminDashboard() {
  const stats = await getAdminStats();

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats.total_users}
          sub={`${stats.senders}S · ${stats.recipients}R · ${stats.admins}A`}
        />
        <StatCard
          icon={FileText}
          label="Documents"
          value={stats.total_documents}
        />
        <StatCard icon={Clock} label="Pending" value={stats.pending_documents} />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={stats.completed_documents}
        />
        <StatCard
          icon={TrendingUp}
          label="Sign Rate"
          value={`${stats.signing_rate}%`}
        />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: ElementType;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="h-10 w-10 rounded-full bg-primary-50 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
