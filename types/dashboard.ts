export type DashboardDateRange = "7d" | "30d" | "90d" | "all";

export type DashboardStatItem = {
  key: string;
  label: string;
  value: number;
  href?: string;
  description?: string;
};

export type ActivityFeedItem = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  projectId: string | null;
  projectName: string | null;
  actorId: string | null;
  actorName: string | null;
  actorRole: string | null;
  createdAt: string;
  href: string | null;
};

export type DashboardData = {
  stats: DashboardStatItem[];
  activity: ActivityFeedItem[];
};
