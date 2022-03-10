import * as IPFS from "ipfs-core";
import { create } from "ipfs-http-client";
import { libp2pConfig } from "ipfs-core-config/libp2p";
import PeerId from "peer-id";
// @ts-ignore
import DelegatedContentRouting from "libp2p-delegated-content-routing";

const DefaultOpt = {
  protocol: "https",
  port: 443,
};
// todo read from env
const DelegateHosts = [
  "node0.delegate.ipfs.io",
  "node1.delegate.ipfs.io",
  "node2.delegate.ipfs.io",
  "node3.delegate.ipfs.io",
];
// In production you should setup your own delegates
const DelegatedHostOpts = DelegateHosts.map((host) => {
  return { ...DefaultOpt, host };
});

const getRoutes = (peerId: PeerId) =>
  DelegatedHostOpts.map(
    (opt) => new DelegatedContentRouting(peerId, create(opt))
  );

const setUPIPFS = async () => {
  const defaultLibp2pConfig = libp2pConfig();
  // https://github.com/libp2p/js-peer-id
  const peerId = await PeerId.create({ bits: 1024, keyType: "RSA" });
  const routes = getRoutes(peerId);
  const ipfs = await IPFS.create({
    config: {
      Addresses: {
        Delegates: DelegateHosts.map((host) => `/dns4/${host}/tcp/443/https`),
      },
    },
    // https://github.com/libp2p/js-libp2p/blob/master/doc/CONFIGURATION.md
    // https://github.com/ipfs/js-ipfs/blob/master/packages/ipfs-core-config/src/libp2p.browser.js
    libp2p: {
      ...defaultLibp2pConfig,
      modules: {
        ...defaultLibp2pConfig.modules,
        contentRouting: routes,
      },
    },
    EXPERIMENTAL: {
      ipnsPubsub: true,
    },
  });
  return ipfs;
};

export const setup = async () => {
  console.log("start ipfs");
  const ipfs = await setUPIPFS();
  console.log("start ipfs done");

  return { ipfs };
};
