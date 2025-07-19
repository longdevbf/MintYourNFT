'use client';

import Image from "next/image";
import { CardanoWallet, useWallet, useWalletList } from '@meshsdk/react';
import { useState } from "react";
import {  ForgeScript, MeshTxBuilder, resolveScriptHash, stringToHex } from "@meshsdk/core";
import { NFT } from '@/interface/nft';
import { txBuilder } from "@/interface/provider";

export default function Home() {
  const { connected, wallet, connect, disconnect } = useWallet();
  const availableWallets = useWalletList();
  const [file, setFile] = useState<File | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [ipfsUrl, setIpfsUrl] = useState<string | null>(null);
  const [nftData, setNftData] = useState<NFT>({ name: "", image: "", mediaType: "", description: "" });
  const [supply, setSupply] = useState<string>("1");
  const [showWalletList, setShowWalletList] = useState(false);
  const addr='addr_test1qpwhc8r32ve7cp6ydnephfmvvrufztxjwm78cv9x87v8mmea5c3gnmvgpy05ecnqzp4f8wjw8mx0nl78sfpyrxa88pks0pgk5z';
  const handleConnect = async (walletName: string) => {
    try {
      await connect(walletName);
      setIsConnected(true);
      setShowWalletList(false);
    } catch (err) {
      setError('Failed to connect wallet');
      console.error(err);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setIsConnected(false);
    } catch (err) {
      setError('Failed to disconnect wallet');
      console.error(err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setNftData({ ...nftData, [e.target.name]: e.target.value });
  };

  const handleMintNft = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }
    if (!file || !nftData.name || !nftData.description) {
      setError("Please complete all fields and select an image");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Step 1: Upload to IPFS
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // Sử dụng ipfs:// format cho NFT metadata
      const ipfsUrl = data.ipfsUrl; // ipfs://QmQqNA1iuWUcq3jUeq4HwcBVHZdDrjJxyAgEpcYJukrF8y
      const gatewayUrl = data.fileUrl; // https://gateway/ipfs/QmQqNA1iuWUcq3jUeq4HwcBVHZdDrjJxyAgEpcYJukrF8y
      
      setIpfsUrl(gatewayUrl); // Hiển thị gateway URL cho preview
      setNftData({ ...nftData, image: ipfsUrl, mediaType: file.type }); // Sử dụng ipfs:// cho NFT

      // Step 2: Mint NFT với metadata
      const address = await wallet.getChangeAddress();
      const forgingScript = ForgeScript.withOneSignature(address);
      const utxos = await wallet.getUtxos();
      const policyID = resolveScriptHash(forgingScript);
      const tokenNameHex = stringToHex(nftData.name);

      // Tạo metadata theo chuẩn CIP-25
      const nftMetadata = {
        name: nftData.name,
        image: ipfsUrl,
        mediaType: file.type,
        description: nftData.description,
      };
      console.log("nftMetadata",nftMetadata)
      // Tạo metadata object theo format Cardano
      const metadata = {
        [policyID]: {
          [nftData.name]: {
            ...nftMetadata
          }
        }
      };

      console.log("NFT Metadata:", metadata);

      const unsignedTx = await txBuilder
        .mint(supply, policyID, tokenNameHex)
        .txOut(addr,
          [ 
            {
              unit: 'lovelace',
              quantity: '100000000'
            }
          ]
        )
        .mintingScript(forgingScript)
        .metadataValue("721", metadata) // Thêm metadata vào transaction
        .changeAddress(address)
        .selectUtxosFrom(utxos)
        
        .complete();

      const signedTx = await wallet.signTx(unsignedTx);
      const txHash = await wallet.submitTx(signedTx);
      alert(`NFT minted successfully! TxHash: ${txHash}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error minting NFT');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-blue-900 p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">Mint Your NFT</h1>
        
        <div className="mb-6">
          {!connected ? (
            <div className="relative">
              <button
                onClick={() => setShowWalletList(!showWalletList)}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Connect Wallet
              </button>
              
              {showWalletList && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  {availableWallets.map((wallet) => (
                    <button
                      key={wallet.name}
                      onClick={() => handleConnect(wallet.name)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center gap-3"
                    >
                      {wallet.icon && (
                        <img 
                          src={wallet.icon} 
                          alt={wallet.name} 
                          className="w-6 h-6"
                        />
                      )}
                      <span className="font-medium">{wallet.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium text-green-800">Wallet Connected</span>
              </div>
              <button
                onClick={handleDisconnect}
                className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">NFT Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full p-2 border rounded-lg"
            />
            {file && (
              <div className="mt-4 relative w-full h-48">
                <Image
                  src={URL.createObjectURL(file)}
                  alt="NFT Preview"
                  layout="fill"
                  objectFit="contain"
                  className="rounded-lg"
                />
              </div>
            )}
            {ipfsUrl && (
              <a
                href={ipfsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 underline mt-2 block"
              >
                View on IPFS
              </a>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">NFT Name</label>
            <input
              type="text"
              name="name"
              value={nftData.name}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-lg mb-4"
              placeholder="Enter NFT name"
            />

            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              name="description"
              value={nftData.description}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-lg mb-4"
              placeholder="Enter NFT description"
              rows={4}
            />

            <label className="block text-sm font-medium text-gray-700 mb-2">Supply</label>
            <input
              type="number"
              value={supply}
              onChange={(e) => setSupply(e.target.value)}
              className="w-full p-2 border rounded-lg mb-4"
              placeholder="Enter supply"
              min="1"
            />
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button
            onClick={handleMintNft}
            disabled={!isConnected || !file || !nftData.name || !nftData.description || uploading}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading & Minting...
              </>
            ) : (
              'Mint NFT'
            )}
          </button>
        </div>

        {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
      </div>
    </div>
  );
}