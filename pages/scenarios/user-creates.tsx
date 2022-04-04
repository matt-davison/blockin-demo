import { makeAssetCreateTxn, sha256 } from 'blockin'
import Layout from '../../components/layout'
import Head from 'next/head'
import React, { SyntheticEvent, useState } from 'react'
import WalletConnect from "@walletconnect/client";
import QRCodeModal from "algorand-walletconnect-qrcode-modal";
import algosdk from "algosdk";
import { formatJsonRpcRequest } from "@json-rpc-tools/utils";
import Wallet from 'components/Wallet/Wallet';

// Create a connector
const connector = new WalletConnect({
    bridge: "https://bridge.walletconnect.org", // Required
    qrcodeModal: QRCodeModal,
});

// Check if connection is already established
if (!connector.connected) {
    // create new session
    connector.createSession();
}

// Subscribe to connection events
connector.on("connect", (error, payload) => {
    if (error) {
        throw error;
    }

    // Get provided accounts
    const { accounts } = payload.params[0];
    console.log(accounts)
});

connector.on("session_update", (error, payload) => {
    if (error) {
        throw error;
    }

    // Get updated accounts 
    const { accounts } = payload.params[0];
});

connector.on("disconnect", (error, payload) => {
    if (error) {
        throw error;
    }
});

async function signAssetCreateTxn(assetAuthorization: string) {
    //Generate an opt in tx
    // Sign transaction
    // txns is an array of algosdk.Transaction like below
    // i.e txns = [txn, ...someotherTxns], but we've only built one transaction in our case
    console.log("SHA 256")
    console.log(connector.accounts[0] + "_SITESECRET_" + assetAuthorization)
    console.log(await sha256(connector.accounts[0] + "_SITESECRET_" + assetAuthorization))
    const txns = [await makeAssetCreateTxn(connector.accounts[0], "Blockin", "AUTH", 1, "blockin-demo", await sha256(assetAuthorization))]
    const txnsToSign = txns.map(txn => {
        const encodedTxn = Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString("base64");

        return {
            txn: encodedTxn,
            message: 'Description of transaction being signed',
            // Note: if the transaction does not need to be signed (because it's part of an atomic group
            // that will be signed by another party), specify an empty singers array like so:
            // signers: [],
        };
    });

    const requestParams = [txnsToSign];
    const request = formatJsonRpcRequest("algo_signTxn", requestParams);
    const result: Array<string | null> = await connector.sendCustomRequest(request);
    const decodedResult = result.map(element => {
        return element ? new Uint8Array(Buffer.from(element, "base64")) : null;
    });
    console.log("Signed TXN")
    console.log(decodedResult)
    const algodServer = "https://testnet-algorand.api.purestake.io/ps2";

    const port = "";
    const token = {
        "x-api-key": "H4sefDbnoL8GO8ooRkxQM6CePHih5XDQ405mcBKy" // fill in yours
    };

    if (decodedResult != null) {
        const stxs: Uint8Array[] = []
        decodedResult.forEach((elem) => {
            if (elem != null) {
                stxs.push(elem)
            }
        });
        const algodClient = new algosdk.Algodv2(token, algodServer, port);
        const sendTx = await algodClient.sendRawTransaction(stxs).do();

        console.log("Transaction : " + sendTx.txId);
    }
}

export default function Page() {
    const [assetAuthorization, setAssetAuthorization] = useState('');
    const submit = async (e: SyntheticEvent) => {
        e.preventDefault();
        signAssetCreateTxn(assetAuthorization);
    }
    return (
        <Layout>
            <Head>
                <title>User Creates ASA</title>
            </Head>
            <Wallet />
            <input type="text" onChange={e => setAssetAuthorization(e.target.value)}/>
            <button onClick={submit}> Sign Asset Create</button>
        </Layout>
    )
}