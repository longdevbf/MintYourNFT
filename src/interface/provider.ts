import { BlockfrostProvider, MeshTxBuilder } from "@meshsdk/core";

export const blockchainProvider = new BlockfrostProvider(`${process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY}`);
export const txBuilder = new MeshTxBuilder({
        fetcher: blockchainProvider,
        submitter: blockchainProvider,
        verbose: true,
    });
  