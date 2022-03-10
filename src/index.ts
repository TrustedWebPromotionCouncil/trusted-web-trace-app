require("dotenv").config();
import express, { Request, Response, NextFunction } from "express";
import * as IPFS from "ipfs-core";

import { setup } from "./setup";
import { AccessLog, Tracer, getKey } from "./trace";
import proxy from "./proxy";
import { errorHandler, logErrors } from "./errorHandler";

const app: express.Express = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.listen(process.env.REACT_APP_TRACE_APP_PORT, () => {
  console.log(`Start on port ${process.env.REACT_APP_TRACE_APP_PORT}.`);
});

const init = async () => {
  const { ipfs } = await setup();
  app.locals.ipfs = ipfs;
};
init();

interface AsyncRequest {
  (req: Request, res: Response, next: NextFunction): Promise<void>;
}

const asyncWrapper = (fn: AsyncRequest) => {
  return (req: Request, res: Response, next: NextFunction) => {
    return fn(req, res, next).catch(next);
  };
};

app.post(
  "/ipfs/start",
  asyncWrapper(async (req, res, next) => {
    const ipfs: IPFS.IPFS = app.locals.ipfs;
    console.log("start ipfs");
    await app.locals.ipfs.start();
    console.log("start ipfs done");
    res.status(204);
    res.send();
  })
);

app.post(
  "/ipfs/stop",
  asyncWrapper(async (req, res, next) => {
    const ipfs: IPFS.IPFS = app.locals.ipfs;
    console.log("stop ipfs");
    await app.locals.ipfs.stop();
    console.log("stop ipfs done");
    res.status(204);
    res.send();
  })
);

app.get(
  "/ipfs/keys",
  asyncWrapper(async (req, res, next) => {
    const ipfs: IPFS.IPFS = app.locals.ipfs;
    const keys = await ipfs.key.list();
    res.json({ keys });
  })
);

app.post(
  "/access-log",
  asyncWrapper(async (req, res, next) => {
    const ipfs: IPFS.IPFS = app.locals.ipfs;
    const body = req.body; // todo うまくデシリアライズされないので一旦決めうち
    const accessLogRequest: AccessLog = {
      companyDid: "did_ion_xxx",
      contactDid: "did:ion:yyy",
      targetCv: "job card",
    };
    const { companyDid } = accessLogRequest;
    const key = await getKey(ipfs, companyDid);
    const tracer = new Tracer(ipfs, key);
    const publishResult = await tracer.saveLog(accessLogRequest);
    console.log(`https://gateway.ipfs.io/ipns/${publishResult.name}`);
    res.json({ publishResult });
  })
);

app.post(
  "/verifiable-credentials",
  asyncWrapper(async (req, res, next) => {
    const ipfs: IPFS.IPFS = app.locals.ipfs;
    const body = req.body;
    const key = await proxy.save(body, ipfs);
    res.status(200);
    res.json({ key });
  })
);

app.get(
  "/verifiable-credentials/:key",
  asyncWrapper(async (req, res, next) => {
    const ipfs: IPFS.IPFS = app.locals.ipfs;
    const { key } = req.params;
    console.log({ key });
    const data = await proxy.get(key, ipfs);
    res.status(200);
    res.json({ data });
  })
);

app.get(
  "/access-log/:owner",
  asyncWrapper(async (req, res, next) => {
    const { owner } = req.params;
    console.log({ owner });
    const data = await proxy.getAccessLog(owner);
    res.status(200);
    res.json(data);
  })
);

app.use(logErrors);
app.use(errorHandler);
