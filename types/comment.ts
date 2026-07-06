export type CommentItem = {
  id: string;
  documentTitle: string;
  projectName: string;
  section: string;
  text: string;
  status: "open" | "resolved" | "returned";
};