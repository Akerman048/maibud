import { logger } from "@/lib/logger";

type MetricLabels = {
  route?: string;
  method?: string;
  statusClass?: string;
  outcome?: "success" | "failure";
  jobType?: "email" | "upload";
};

function emit(metricName: string, value: number, labels: MetricLabels) {
  if (process.env.METRICS_LOG_ENABLED !== "true") return;
  logger.info("metric", { metricName, value, labels });
}

export const metrics = {
  httpRequest(route: string, method: string, status: number, durationMs: number) {
    const labels = { route, method, statusClass: `${Math.floor(status / 100)}xx` };
    emit("http_requests_total", 1, labels);
    emit("http_request_duration_ms", durationMs, labels);
  },
  dbReadinessFailure() {
    emit("db_readiness_failures_total", 1, { outcome: "failure" });
  },
  emailJobs(processed: number, outcome: "success" | "failure") {
    emit("email_jobs_processed_total", processed, { jobType: "email", outcome });
  },
  uploadCompletionFailure() {
    emit("upload_completion_failures_total", 1, { jobType: "upload", outcome: "failure" });
  },
};
