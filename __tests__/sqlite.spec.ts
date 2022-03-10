import {
  MetaData,
  AccessLogPayload,
  upload,
  get,
  getAccessLog,
  appendAccessLog,
} from "../src/sqlite";
import { v4 as uuidv4 } from "uuid";

describe("sqlite", () => {
  test("upload() and get()", async () => {
    const owner = "did:ion:EiDS1uonEtvzBgHM7XNsTQYtgrQaB3BajhxCv5_nY1HVqA";
    const aud = "did:ion:EiBiVaUb_7fr1sYefT1-1jy3ysNQ1pU29znEjTal9TFJkA";
    const key = uuidv4();
    const data: MetaData = {
      aud,
      cvType: "jobApplicationCredential",
      owner,
      cid: "dummy",
    };
    await upload(key, data);
    const saved = await get(key);
    expect(saved).toMatchObject(data);
  });
  test("appendAccessLog and getAccessLog()", async () => {
    const owner = "did:ion:EiDS1uonEtvzBgHM7XNsTQYtgrQaB3BajhxCv5_nY1HVqA";
    const aud = "did:ion:EiBiVaUb_7fr1sYefT1-1jy3ysNQ1pU29znEjTal9TFJkA";
    const key = uuidv4();
    const metaData: MetaData = {
      aud,
      cvType: "jobApplicationCredential",
      owner,
      cid: "dummy",
    };
    await appendAccessLog(key, metaData);
    const latest: AccessLogPayload = {
      operator: aud,
      targetKey: key,
      cvType: "jobApplicationCredential",
    };
    const logs = await getAccessLog(owner);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0]).toMatchObject(latest);
  });
});
