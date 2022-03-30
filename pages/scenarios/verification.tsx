import { createChallenge, makeAssetOptInTxn, verifyChallenge } from 'blockin'
import Layout from '../../components/layout'
import Head from 'next/head'
import React from 'react'
import WalletConnect from "@walletconnect/client";
import QRCodeModal from "algorand-walletconnect-qrcode-modal";
import algosdk, { decodeAddress, decodeSignedTransaction, mnemonicToSecretKey, signTransaction } from "algosdk";
import { formatJsonRpcRequest } from "@json-rpc-tools/utils";
import Wallet from 'components/Wallet/Wallet';
import { Scenario, ScenarioReturnType, signTxnWithTestAccount } from 'scenarios';
import { apiGetTxnParams, ChainType } from 'helpers/api';
import { connect } from 'http2';
import nacl, { verify } from 'tweetnacl';
import { Account } from 'algosdk/dist/types/src/client/v2/algod/models/types';

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

const signChallenge = async () => {
    const message = await createChallenge('https://vt.edu', 'Blockin', connector.accounts[0], '');
    console.log(message);

    const suggestedParams = await apiGetTxnParams(ChainType.TestNet);


    const txn = await algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: connector.accounts[0],
        to: connector.accounts[0],
        amount: 0,
        note: new Uint8Array(Buffer.from(message)),
        suggestedParams,
    });

    const txns = [txn];
    const txnsToSign = txns.map(txn => {
        const encodedTxn = Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString("base64");
        console.log("ENCODED TXN BASE 64 STRING", encodedTxn);
        console.log("NOT BUFFERED", algosdk.encodeUnsignedTransaction(txn))
        return {
            txn: encodedTxn,
            message
        };
    });

    const requestParams = [txnsToSign];
    const request = formatJsonRpcRequest("algo_signTxn", requestParams);
    const result: Array<string | null> = await connector.sendCustomRequest(request);
    console.log("Raw response:", result);
    const decodedResult = result.map(element => {
        return element ? new Uint8Array(Buffer.from(element, "base64")) : null;
    });

    console.log(decodedResult);

    const txnsFormatted = [
        {
            txn,
            message
        },
    ];

    const txnsArr: ScenarioReturnType = [txnsFormatted];

    const indexToGroup = (index: number) => {
        for (let group = 0; group < txnsArr.length; group++) {
            const groupLength = txnsArr[group].length;
            if (index < groupLength) {
                return [group, index];
            }

            index -= groupLength;
        }

        throw new Error(`Index too large for groups: ${index}`);
    };

    const signedPartialTxns: Array<Array<Uint8Array | null>> = txnsArr.map(() => []);
    result.forEach((r, i) => {
        const [group, groupIndex] = indexToGroup(i);
        const toSign = txnsArr[group][groupIndex];

        if (r == null) {
            if (toSign.signers !== undefined && toSign.signers?.length < 1) {
                signedPartialTxns[group].push(null);
                return;
            }
            throw new Error(`Transaction at index ${i}: was not signed when it should have been`);
        }

        if (toSign.signers !== undefined && toSign.signers?.length < 1) {
            throw new Error(`Transaction at index ${i} was signed when it should not have been`);
        }

        const rawSignedTxn = Buffer.from(r, "base64");
        signedPartialTxns[group].push(new Uint8Array(rawSignedTxn));
    });

    const signedTxnInfo: Array<Array<{
        txID: string;
        signingAddress?: string;
        signature: string;
    } | null>> = signedPartialTxns.map((signedPartialTxnsInternal, group) => {
        return signedPartialTxnsInternal.map((rawSignedTxn, i) => {
            if (rawSignedTxn == null) {
                return null;
            }

            const signedTxn = algosdk.decodeSignedTransaction(rawSignedTxn);
            console.log(signedTxn);

            const txn = (signedTxn.txn as unknown) as algosdk.Transaction;
            const txID = txn.txID();
            const unsignedTxID = txnsArr[group][i].txn.txID();

            if (txID !== unsignedTxID) {
                throw new Error(
                    `Signed transaction at index ${i} differs from unsigned transaction. Got ${txID}, expected ${unsignedTxID}`,
                );
            }

            if (!signedTxn.sig) {
                throw new Error(`Signature not present on transaction at index ${i}`);
            }

            console.log("SIGNED TXN SIG IN FUNC", signedTxn.sig);

            return {
                txID,
                signingAddress: signedTxn.sgnr ? algosdk.encodeAddress(signedTxn.sgnr) : undefined,
                signature: Buffer.from(signedTxn.sig).toString("base64"),
            };
        });
    });

    console.log("Signed txn info:", signedTxnInfo);
    if (signedTxnInfo && signedTxnInfo[0] && signedTxnInfo[0][0]) {
        const signature = Buffer.from(signedTxnInfo[0][0].signature, 'base64');
        const txnBytes = new Uint8Array(txn.bytesToSign());

        // console.log();

        const verified = await verifyChallenge(txnBytes, signature);
        console.log(verified);
    } else {
        throw 'Error: should not reach here';
    }





    //     signedTxnInfo.forEach(async (elem) => {
    //         if (elem && elem[0] && elem[0].signature) {

    //             console.log(res);
    //         }
    //     });
    // }


};


export default function VerificationPage() {
    return (
        <Layout>
            <Head>
                <title>Verification - Challenge/Response</title>
            </Head>
            <Wallet />
            <button onClick={signChallenge}> Sign Opt In</button>
        </Layout>
    )
}