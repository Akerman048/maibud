import { handlers } from "@/auth";
import { withApiObservability } from "@/lib/api-observability";

export const GET = withApiObservability("/api/auth/[...nextauth]", handlers.GET);
export const POST = withApiObservability("/api/auth/[...nextauth]", handlers.POST);
