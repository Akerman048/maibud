export type CommentThreadStatusValue =
  | "open"
  | "resolved"
  | "returned";

export type CommentThreadActionState = {
  error: string;
  success: boolean;
  threadId?: string;
};

export type CommentMessageItem = {
  id: string;
  content: string | null;
  isDeleted: boolean;
  isFirstMessage: boolean;
  canDelete: boolean;
  authorId: string;
  authorName: string;
  authorRole: string;
  createdAt: string;
  editedAt: string | null;
};

export type CommentThreadItem = {
  id: string;
  title: string | null;
  section: string | null;
  status: CommentThreadStatusValue;
  projectId: string;
  projectName: string;
  documentId: string;
  documentTitle: string;
  documentVersionId: string | null;
  version: number | null;
  createdByName: string;
  resolvedByName: string | null;
  resolvedAt: string | null;
  messages: CommentMessageItem[];
  messageCount?: number;
  createdAt: string;
  updatedAt: string;
};
