import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION;

if (!region) {
  throw new Error("AWS_REGION is not configured");
}

export const s3 = new S3Client({
  region,
});