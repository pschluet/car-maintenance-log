// Prepares the docker-compose local stack: creates the DynamoDB table and
// GSI, creates the S3 (MinIO) bucket + CORS rule, and seeds one sample car
// so the app isn't a blank slate on first run. Safe to re-run — every step
// tolerates "already exists".
//
// Runs from the host (`npm run seed:local`), so it talks to the
// host-mapped ports (8000/9000) rather than the in-network service names
// docker-compose gives the app container.

import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  ResourceInUseException,
  ResourceNotFoundException,
} from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import {
  BucketAlreadyOwnedByYou,
  CreateBucketCommand,
  PutBucketCorsCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const TABLE_NAME = "CarMaintenanceLog";
const BUCKET_NAME = "car-maintenance-log-attachments";

const credentials = { accessKeyId: "localdev", secretAccessKey: "localdev123" };

const ddb = new DynamoDBClient({
  endpoint: "http://localhost:8000",
  region: "us-east-1",
  credentials,
});
const doc = DynamoDBDocumentClient.from(ddb, { marshallOptions: { removeUndefinedValues: true } });
const s3 = new S3Client({
  endpoint: "http://localhost:9000",
  region: "us-east-1",
  credentials,
  forcePathStyle: true,
});

async function ensureTable(): Promise<void> {
  try {
    await ddb.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    console.log(`Table ${TABLE_NAME} already exists.`);
    return;
  } catch (err) {
    if (!(err instanceof ResourceNotFoundException)) throw err;
  }

  await ddb.send(
    new CreateTableCommand({
      TableName: TABLE_NAME,
      BillingMode: "PAY_PER_REQUEST",
      AttributeDefinitions: [
        { AttributeName: "pk", AttributeType: "S" },
        { AttributeName: "sk", AttributeType: "S" },
        { AttributeName: "gsi1pk", AttributeType: "S" },
        { AttributeName: "gsi1sk", AttributeType: "S" },
      ],
      KeySchema: [
        { AttributeName: "pk", KeyType: "HASH" },
        { AttributeName: "sk", KeyType: "RANGE" },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "GSI1",
          KeySchema: [
            { AttributeName: "gsi1pk", KeyType: "HASH" },
            { AttributeName: "gsi1sk", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "ALL" },
        },
      ],
    })
  );
  console.log(`Created table ${TABLE_NAME}.`);
}

async function ensureBucket(): Promise<void> {
  try {
    await s3.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
    console.log(`Created bucket ${BUCKET_NAME}.`);
  } catch (err) {
    if (!(err instanceof BucketAlreadyOwnedByYou)) throw err;
    console.log(`Bucket ${BUCKET_NAME} already exists.`);
  }

  try {
    await s3.send(
      new PutBucketCorsCommand({
        Bucket: BUCKET_NAME,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedMethods: ["GET", "PUT"],
              AllowedOrigins: ["http://localhost:3000"],
              AllowedHeaders: ["*"],
              ExposeHeaders: ["ETag"],
            },
          ],
        },
      })
    );
  } catch (err) {
    // Best-effort: not every MinIO build supports bucket CORS the same way
    // S3 does. Presigned PUT/GET still work without it in most browsers
    // for same-machine local dev; this just tightens things up when it's
    // supported.
    console.warn("Could not set bucket CORS (non-fatal):", (err as Error).message);
  }
}

async function seedSampleCar(): Promise<void> {
  const existing = await doc
    .send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          pk: "CAR#sample-car",
          sk: "META",
          gsi1pk: "CARS",
          gsi1sk: "sample car",
          id: "sample-car",
          name: "Sample Car",
          year: 2020,
          color: "Silver",
          createdAt: new Date(0).toISOString(),
          updatedAt: new Date(0).toISOString(),
        },
        ConditionExpression: "attribute_not_exists(pk)",
      })
    )
    .catch((err: unknown) => {
      if ((err as { name?: string }).name === "ConditionalCheckFailedException") return "exists";
      throw err;
    });

  console.log(existing === "exists" ? "Sample car already exists." : "Seeded a sample car.");
}

async function main() {
  try {
    await ensureTable();
  } catch (err) {
    if (!(err instanceof ResourceInUseException)) throw err;
  }
  await ensureBucket();
  await seedSampleCar();
  console.log("Local stack is ready. Run `npm run dev` or `docker compose up`.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
