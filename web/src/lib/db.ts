import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  type QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = process.env.TABLE_NAME ?? "CarMaintenanceLog";

// DYNAMODB_ENDPOINT is only set locally (docker-compose points it at
// dynamodb-local); in every deployed environment it's absent and the SDK
// talks to real AWS DynamoDB using its normal region/credential defaults.
const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    endpoint: process.env.DYNAMODB_ENDPOINT || undefined,
  }),
  { marshallOptions: { removeUndefinedValues: true } }
);

export interface Key {
  pk: string;
  sk: string;
}

export const db = {
  tableName: TABLE_NAME,

  // Takes a {pk, sk} object (rather than two positional strings) so every
  // call site can pass a `keys.*()` builder result directly instead of
  // spreading it — spreading Object.values() into two params doesn't
  // type-check as a tuple under noUncheckedIndexedAccess.
  async get<T>(key: Key): Promise<T | undefined> {
    const res = await client.send(new GetCommand({ TableName: TABLE_NAME, Key: key }));
    return res.Item as T | undefined;
  },

  async put<T extends object>(item: T): Promise<void> {
    await client.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  },

  async delete(key: Key): Promise<void> {
    await client.send(new DeleteCommand({ TableName: TABLE_NAME, Key: key }));
  },

  async queryByPk<T>(
    pk: string,
    opts: { skPrefix?: string; scanIndexForward?: boolean } = {}
  ): Promise<T[]> {
    const { skPrefix, scanIndexForward } = opts;
    const input: QueryCommandInput = {
      TableName: TABLE_NAME,
      KeyConditionExpression: skPrefix ? "pk = :pk AND begins_with(sk, :skPrefix)" : "pk = :pk",
      ExpressionAttributeValues: skPrefix ? { ":pk": pk, ":skPrefix": skPrefix } : { ":pk": pk },
      ScanIndexForward: scanIndexForward,
    };
    const res = await client.send(new QueryCommand(input));
    return (res.Items ?? []) as T[];
  },

  async queryGsi1<T>(gsi1pk: string): Promise<T[]> {
    const res = await client.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "GSI1",
        KeyConditionExpression: "gsi1pk = :gsi1pk",
        ExpressionAttributeValues: { ":gsi1pk": gsi1pk },
      })
    );
    return (res.Items ?? []) as T[];
  },
};

// --- Key builders -----------------------------------------------------
// Centralized here so every read/write path agrees on the same shapes
// documented in the implementation plan's data-model table.

export const keys = {
  car: (carId: string) => ({ pk: `CAR#${carId}`, sk: "META" }),
  carGsi: (name: string) => ({ gsi1pk: "CARS", gsi1sk: name.toLowerCase() }),
  tireSet: (carId: string, tireSetId: string) => ({
    pk: `CAR#${carId}`,
    sk: `TIRESET#${tireSetId}`,
  }),
  carDoc: (carId: string, kind: string, docId: string) => ({
    pk: `CAR#${carId}`,
    sk: `DOC#${kind}#${docId}`,
  }),
  entry: (carId: string, date: string, entryId: string) => ({
    pk: `CAR#${carId}`,
    sk: `ENTRY#${date}#${entryId}`,
  }),
  mechanic: (mechanicId: string) => ({ pk: `MECHANIC#${mechanicId}`, sk: "META" }),
  mechanicGsi: (name: string) => ({ gsi1pk: "MECHANICS", gsi1sk: name.toLowerCase() }),
  user: (sub: string) => ({ pk: `USER#${sub}`, sk: "META" }),
  userGsi: (email: string) => ({ gsi1pk: "USERS", gsi1sk: email.toLowerCase() }),
};
