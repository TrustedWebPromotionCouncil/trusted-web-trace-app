import sqlite3 from "sqlite3";
import { open } from "sqlite";

// https://stacktuts.com/typescript-returntype-remove-promise
type Unpromisify<T> = T extends Promise<infer U> ? U : T;
let __database: Unpromisify<ReturnType<typeof open>> | undefined;

interface Row {
  key: string;
  data: string;
}

const TABLE_NAME = "vc_meta_data";
const TABLE_NAME2 = "vc_access_logs";

export async function openDb() {
  const filepath = process.env["DATABASE_FILEPATH"];
  if (typeof filepath === "undefined") {
    throw new Error("DATABASE_FILEPATH envvar not defined");
  } else if (typeof __database === "undefined") {
    __database = await open({
      filename: filepath,
      driver: sqlite3.Database,
    });
  }
  return __database;
}

const checkIfTableExists = async (table_name: string) => {
  try {
    const db = await openDb();
    const result = await db.get<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='${table_name}';`
    );
    return result?.name === table_name;
  } catch (err) {
    throw err;
  }
};

type TableName = typeof TABLE_NAME | typeof TABLE_NAME2;
const tableMap = {
  [TABLE_NAME]: `CREATE TABLE ${TABLE_NAME} (key VARCHAR(40), data VARCHAR(2047), created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
  [TABLE_NAME2]: `CREATE TABLE ${TABLE_NAME2} (owner VARCHAR(1024), data VARCHAR(2047), created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
};
export const createTableIfNotFound = async (tableName: TableName) => {
  if (await checkIfTableExists(tableName)) {
    return;
  } else {
    try {
      const db = await openDb();
      // key is UUID and it's 36 char length.
      await db.exec(tableMap[tableName]);
    } catch (err) {
      throw err;
    }
  }
};

createTableIfNotFound(TABLE_NAME);
createTableIfNotFound(TABLE_NAME2);

export interface MetaData {
  aud: string;
  owner: string;
  cid: string;
  cvType: string;
}
export interface AccessLogPayload {
  operator: string;
  targetKey: string;
  cvType: string;
}
export const getAccessLog = async (owner: string) => {
  try {
    const db = await openDb();
    // https://github.com/kriasoft/node-sqlite#getting-many-rows
    const result = await db.all<{ data: string; created_at: Date }[]>(
      `SELECT data, created_at FROM ${TABLE_NAME2} WHERE owner = ? ORDER BY created_at desc`,
      owner
    );
    return result.map((row) => {
      const data = JSON.parse(row.data);
      return { ...data, createdAt: row.created_at };
    });
  } catch (err) {
    throw err;
  }
};

export const get = async (key: string) => {
  try {
    const db = await openDb();
    // https://github.com/kriasoft/node-sqlite#getting-a-single-row
    const result = await db.get<{ data: string }>(
      `SELECT data FROM ${TABLE_NAME} WHERE key = ?`,
      key
    );
    if (result?.data) {
      const data: MetaData = JSON.parse(result.data);
      return data;
    } else {
      throw new Error("sqlite.get(): Key Not Found");
    }
  } catch (err) {
    throw err;
  }
};

export const upload = async (key: string, metaData: MetaData) => {
  try {
    const db = await openDb();
    const result = await db.run(
      `INSERT INTO ${TABLE_NAME} (key, data) VALUES (?, ?)`,
      key,
      JSON.stringify(metaData)
    );
    return result;
  } catch (err) {
    console.error(err);
    throw new Error("Failed to save data.");
  }
};

export const appendAccessLog = async (key: string, metaData: MetaData) => {
  console.info("append access log");
  try {
    const db = await openDb();
    const { owner, aud, cvType } = metaData;
    const logPayload: AccessLogPayload = {
      operator: aud,
      targetKey: key,
      cvType,
    };
    // log history
    await db.run(
      `INSERT INTO ${TABLE_NAME2} (owner, data) VALUES (?, ?)`,
      owner,
      JSON.stringify(logPayload)
    );
  } catch (err) {
    console.error(err);
    throw new Error("Failed to save data.");
  }
};

export default { upload, get, appendAccessLog, getAccessLog };
