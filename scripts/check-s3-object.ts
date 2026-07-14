import "dotenv/config";

import {
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION;
const bucket = process.env.AWS_S3_BUCKET;
const objectKey = process.argv[2];

if (!region) {
  throw new Error("AWS_REGION is missing");
}

if (!bucket) {
  throw new Error("AWS_S3_BUCKET is missing");
}

if (!objectKey) {
  throw new Error("Pass objectKey as first argument");
}

const s3 = new S3Client({
  region,
});

async function main() {
  const result = await s3.send(
    new HeadObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    }),
  );

  console.dir(
    {
      contentLength: result.ContentLength,
      contentType: result.ContentType,
      etag: result.ETag,
      versionId: result.VersionId,
      encryption: result.ServerSideEncryption,
    },
    { depth: null },
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    s3.destroy();
  });