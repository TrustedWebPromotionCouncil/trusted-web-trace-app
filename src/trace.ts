import * as IPFS from "ipfs-core";
import { Key } from "ipfs-core-types/types/src/key";

export interface AccessLog {
  companyDid: string;
  contactDid: string;
  targetCv: string;
}

export const getKey = async (ipfs: IPFS.IPFS, keyName: string) => {
  console.log({ keyName });
  const keys = await ipfs.key.list();
  let key = keys.find((key) => key.name === keyName);
  // 初回はキーを登録 (HR系のSaaSがサービスを提供していて、複数の企業がAPIを利用する世界観)
  if (!key) {
    // todo パラメータをコンフィギュレーションから変更できるように
    const generated = await ipfs.key.gen(keyName, {
      type: "rsa",
      size: 2048,
    });
    console.log({ generated });
    key = generated;
  }
  return key;
};

export class Tracer {
  ipfs: IPFS.IPFS;
  key: Key;

  constructor(ipfs: IPFS.IPFS, key: Key) {
    this.ipfs = ipfs;
    this.key = key;
    console.info({ key });
  }

  async saveLog(log: AccessLog) {
    const latestCid = await this.getLatestLog(this.key);
    const wholeLogs = await this.mergeLog(log, latestCid);
    return await this.publish(wholeLogs);
  }

  async getLatestLog(key: Key) {
    try {
      for await (const name of this.ipfs.name.resolve(key.id)) {
        console.log(name);
        // /ipfs/QmQrX8hka2BtNHa8N8arAq16TCVx5qHcb46c5yPewRycLm
        return name;
      }
    } catch (error) {
      console.log(error);
    }
    return null;
  }

  async mergeLog(newLog: AccessLog, latestCid: string | null) {
    if (latestCid) {
      for await (const chunk of this.ipfs.cat(latestCid)) {
        console.info({ chunk });
        const latest: AccessLog[] = JSON.parse(new TextDecoder().decode(chunk));
        console.info({ latest });
        return [...latest, newLog];
      }
      throw new Error("Wrong method call. latestCid may be wrong.");
    } else {
      return [newLog];
    }
  }

  async publish(wholeLogs: AccessLog[]) {
    console.info({ wholeLogs });
    const result = await this.ipfs.add(JSON.stringify(wholeLogs));
    const cid = result.path;
    console.info({ cid });
    // https://github.com/ipfs/js-ipfs/blob/master/docs/core-api/NAME.md#ipfsnamepublishvalue-options
    const publishResult = await this.ipfs.name.publish(`/ipfs/${cid}`, {
      key: this.key.name,
      allowOffline: false,
    });
    return publishResult;
  }
}
