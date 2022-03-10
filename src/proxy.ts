import Ajv from "ajv";
import { Buffer } from "buffer";
import { v4 as uuidv4 } from "uuid";
import * as IPFS from "ipfs-core";
import jwt_decode from "jwt-decode";
// @ts-ignore
import ION from "@decentralized-identity/ion-tools";

import sqlite, { MetaData } from "./sqlite";
import { InvalidParameterError, UnAuthorizedError } from "./errorHandler";
import { DIDResolutionResult } from "./types";

interface Request {
  vc: string;
  owner: string;
  aud: string;
  cvType: string;
}

const schema = {
  type: "object",
  properties: {
    vc: { type: "string" },
    owner: { type: "string" },
    aud: { type: "string" },
    cvType: { type: "string" },
  },
  required: ["vc", "owner", "aud", "cvType"],
  additionalProperties: false,
};

const ajv = new Ajv();
const validate = ajv.compile(schema);

export const save = async (data: Request, ipfs: IPFS.IPFS) => {
  const { vc, owner, aud, cvType } = data;
  const valid = validate(data);
  if (!valid) {
    if (validate.errors) {
      validate.errors.forEach((eo) => {
        console.info(eo);
      });
    }
    throw new InvalidParameterError("input data is invalid.", validate.errors);
  }
  const result = await ipfs.add(vc);
  const cid = result.path;

  const uuid = uuidv4();
  const key = `${uuid}`;
  const metaData: MetaData = {
    cid,
    owner,
    aud,
    cvType,
  };
  await sqlite.upload(key, metaData);
  return uuid;
};

export const get = async (keyJws: string, ipfs: IPFS.IPFS) => {
  // デコードしてオブジェクトキーを取得
  let decoded = { value: "" };
  try {
    decoded = jwt_decode<{ value: string }>(keyJws);
  } catch (err) {
    throw new InvalidParameterError("input data is invalid.", validate.errors);
  }

  // dbからメタデータを取得
  const { value } = decoded;
  const key = `${value}`;
  const metaData = await sqlite.get(key);

  const { cid, aud } = metaData;

  // 公開鍵を取得
  // https://github.com/decentralized-identity/ion-tools#ionresolvedid_uri-options-async
  const resolveResult: DIDResolutionResult = await ION.resolve(aud);
  const publicJwk =
    resolveResult.didDocument?.verificationMethod![0].publicKeyJwk;

  // 署名を検証
  // https://github.com/decentralized-identity/ion-tools#ionverifyjwsparams
  try {
    const verifyResult = await ION.verifyJws({
      jws: keyJws,
      publicJwk,
    });
    console.debug({ verifyResult });
    if (verifyResult) {
      // ipfsからデータを取得して返す
      console.debug(`ipfs cat ${cid}`);
      // https://github.com/ipfs/js-ipfs/blob/master/docs/core-api/FILES.md#ipfscatipfspath-options
      const bufArray = [];
      for await (const chunk of ipfs.cat(cid)) {
        bufArray.push(chunk);
      }
      const buf = Buffer.concat(bufArray);
      const data = buf.toString();

      // ipfsからデータが取得できたらアクセスログを記録
      await sqlite.appendAccessLog(key, metaData);
      return data;
    } else {
      throw new UnAuthorizedError("verification error");
    }
  } catch (err) {
    throw err;
  }
};

export const getAccessLog = async (ownerJws: string) => {
  // デコードしてオブジェクトキーを取得
  let decoded = { did: "" };
  try {
    decoded = jwt_decode<{ did: string }>(ownerJws);
  } catch (err) {
    throw new InvalidParameterError("input data is invalid.", validate.errors);
  }
  // dbからメタデータを取得
  const { did } = decoded;
  // 公開鍵を取得
  // https://github.com/decentralized-identity/ion-tools#ionresolvedid_uri-options-async
  const resolveResult: DIDResolutionResult = await ION.resolve(did);
  const publicJwk =
    resolveResult.didDocument?.verificationMethod![0].publicKeyJwk;
  // 署名を検証
  // https://github.com/decentralized-identity/ion-tools#ionverifyjwsparams
  try {
    const verifyResult = await ION.verifyJws({
      jws: ownerJws,
      publicJwk,
    });
    console.debug({ verifyResult });
    if (verifyResult) {
      const logs = await sqlite.getAccessLog(did);
      return logs;
    } else {
      throw new UnAuthorizedError("verification error");
    }
  } catch (err) {
    throw err;
  }
};

export default { save, get, getAccessLog };
