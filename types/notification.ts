export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string | null;
  readAt: string | null;
  isRead: boolean;
  actorName: string | null;
  projectName: string | null;
  createdAt: string;
};

export type NotificationPage = {
  items: NotificationItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  unreadCount: number;
};

export type NotificationActionState = {
  error: string;
  success: boolean;
};

export type NotificationFilter = "all" | "unread" | "read";
