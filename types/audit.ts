export type AuditLogItem = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  userName: string | null;
  documentTitle: string | null;
  commentText: string | null;
};