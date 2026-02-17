import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/actions";
import { getGlobalActivity } from "@/features/activity/actions";
import { ActivityTimeline } from "@/features/activity/components/activity-timeline";

export default async function ActivityPage() {
  const profile = await getCurrentUser();
  if (!profile || profile.role !== "admin") redirect("/dashboard");

  const activities = await getGlobalActivity();
  return <ActivityTimeline activities={activities} />;
}
