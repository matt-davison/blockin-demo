import { createChallenge, verifyChallenge } from 'blockin'
import Layout from '../../components/layout'
import Head from 'next/head'
import React from 'react'
import algosdk from "algosdk";
import { formatJsonRpcRequest } from "@json-rpc-tools/utils";
import Wallet from 'components/Wallet/Wallet';
import { ScenarioReturnType } from 'scenarios';
import { apiGetTxnParams, ChainType } from 'helpers/api';
import { connector } from '../../helpers/walletconnect';

const getChallengeFromBlockin = async (): Promise<string> => {
    //we can also make these parameters inputs to the overall function to be more dynamic
    const message = await createChallenge('https://vt.edu', 'Blockin', connector.accounts[0], '');
    console.log("CREATED CHALLENGE", message);

    return message
}

const constructTxnObject = async (message: string): Promise<algosdk.Transaction> => {
    const suggestedParams = await apiGetTxnParams(ChainType.TestNet);

    const txn = await algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: connector.accounts[0],
        to: connector.accounts[0],
        amount: 0,
        note: new Uint8Array(Buffer.from(message)),
        suggestedParams,
    });

    return txn;
}


//confusing algoSDK stuff
const parseSignedTransactions = async (txnsFormattedForAlgoSdk: ScenarioReturnType, result: Array<string | null>):
    Promise<Array<Array<{
        txID: string;
        signingAddress?: string;
        signature: string;
    } | null>>> => {

    const indexToGroup = (index: number) => {
        for (let group = 0; group < txnsFormattedForAlgoSdk.length; group++) {
            const groupLength = txnsFormattedForAlgoSdk[group].length;
            if (index < groupLength) {
                return [group, index];
            }

            index -= groupLength;
        }

        throw new Error(`Index too large for groups: ${index}`);
    };

    const signedPartialTxns: Array<Array<Uint8Array | null>> = txnsFormattedForAlgoSdk.map(() => []);
    result.forEach((r, i) => {
        const [group, groupIndex] = indexToGroup(i);
        const toSign = txnsFormattedForAlgoSdk[group][groupIndex];

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
            // console.log(signedTxn);

            const txn = (signedTxn.txn as unknown) as algosdk.Transaction;
            const txID = txn.txID();
            const unsignedTxID = txnsFormattedForAlgoSdk[group][i].txn.txID();

            if (txID !== unsignedTxID) {
                throw new Error(
                    `Signed transaction at index ${i} differs from unsigned transaction. Got ${txID}, expected ${unsignedTxID}`,
                );
            }

            if (!signedTxn.sig) {
                throw new Error(`Signature not present on transaction at index ${i}`);
            }

            // console.log("SIGNED TXN SIG IN FUNC", signedTxn.sig);

            return {
                txID,
                signingAddress: signedTxn.sgnr ? algosdk.encodeAddress(signedTxn.sgnr) : undefined,
                signature: Buffer.from(signedTxn.sig).toString("base64"),
            };
        });
    });

    return signedTxnInfo;
}


const signChallenge = async () => {
    const message = await getChallengeFromBlockin();

    const txn = await constructTxnObject(message);

    //This step was a bit weird and confusing. AlgoSDK Parsing of txns and wallet connect params 
    //had two slightly different formats
    const txnsToSignInWalletConnectFormat = [
        {
            txn: Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString("base64"),
            message
        }
    ];

    const txnsFormattedForAlgoSdk: ScenarioReturnType = [
        [
            {
                txn,
                message
            },
        ]
    ];

    //Send Wallet Connect algo_signTxn request; waits here until you accept within wallet
    const requestParams = [txnsToSignInWalletConnectFormat];
    const request = formatJsonRpcRequest("algo_signTxn", requestParams);
    const result: Array<string | null> = await connector.sendCustomRequest(request);
    console.log("Raw response:", result);

    //Confusing AlgoSDK parsing stuff; returns a 2D array of the signed txns (since we have one 
    //txn and no groups, only [0][0] is defined)
    const signedTxnInfo = await parseSignedTransactions(txnsFormattedForAlgoSdk, result);
    console.log("Signed txn info:", signedTxnInfo);

    //Get signature and call blockin's verifyChallenge
    if (signedTxnInfo && signedTxnInfo[0] && signedTxnInfo[0][0]) {
        //Get Uint8Arrays of a) the bytes that were signed and b) the signature
        const signature = Buffer.from(signedTxnInfo[0][0].signature, 'base64');
        const txnBytes = new Uint8Array(txn.bytesToSign());

        //Blockin verify
        //Note: It will always return a string and should never throw an error
        //Returns "Successfully granted access via Blockin" upon success
        const verified = await verifyChallenge(txnBytes, signature);
        console.log(verified);
    }
};


export default function VerificationPage() {
    return (
        <Layout>
            <Head>
                <title>Verification - Challenge/Response</title>
            </Head>
            <Wallet />
            <button onClick={signChallenge}> Sign Challenge</button>
        </Layout>
    )
}