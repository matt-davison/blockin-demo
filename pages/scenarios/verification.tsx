import { createChallenge, verifyChallenge } from 'blockin'
import Layout from '../../components/layout'
import Head from 'next/head'
import React, { useState } from 'react'
import algosdk from "algosdk";
import { formatJsonRpcRequest } from "@json-rpc-tools/utils";
import Wallet from 'components/Wallet/Wallet';
import { ScenarioReturnType } from 'scenarios';
import { apiGetTxnParams, ChainType } from 'helpers/api';
import { connector } from '../../helpers/walletconnect';
import { FailuerIcon, LoadIcon, SuccessIcon } from '@components/icons';

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

    // This is where the request gets sent to the wallet...
    const result: Array<string | null> = await connector.sendCustomRequest(request);
    alert("done")
    if (result == null) {
        alert("Challenge failed!")
        return false
    }

    console.log("Raw response:", result);
    console.log(result)

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
        return true
    }
    else {
        alert("Challenge failed")
        return false
    }
};

const loadingScreen = <>
    <LoadIcon className='w-10 h-10 mx-auto text-blue-500 ' />
    <p className='pt-10'>Go to your wallet and accept the challenge request...</p>
</>

const successScreen = <div>
    <div className='flex justify-center items-center space-x-1'>
        <SuccessIcon className='w-10 h-10 text-green-500' />
        <p className='font-bold'>Challenge succeeded!</p>
        <SuccessIcon className='w-10 h-10 text-green-500' />
    </div>
    <p>You are now authenticated</p>
</div>

const failureScreen = <div>
    <div className='flex justify-center items-center space-x-1'>
        <FailuerIcon className='w-10 h-10 text-red-500' />
        <p className='font-bold'>Challenge failed!</p>
        <FailuerIcon className='w-10 h-10 text-red-500' />
    </div>
    <p>You are NOT authenticated</p>
</div>

export default function VerificationPage() {
    const [signingChallenge, setSigningChallenge] = useState(false)
    const [message, setMessage] = useState(loadingScreen)

    const handleChallenge = async () => {
        setSigningChallenge(true)
        if (await signChallenge()) {
            setMessage(successScreen)
        }
        else {
            setMessage(failureScreen)
        }
    }

    return (
        <Layout>
            <Head>
                <title>Verification - Challenge/Response</title>
            </Head>
            <div className='text-center mt-20'>
                {
                    signingChallenge ?
                    <>
                        {message}
                    </> :
                    <>
                        <div className="">
                            <h3>Sign in to WalletConnect to get started</h3>
                            <button
                            onClick={walletConnectInit}
                            className="bg-blue-500 rounded-xl text-white px-3 py-2 my-3"
                            >
                            Connect to WalletConnect
                            </button>
                        </div>
                        <button className='bg-blue-500 rounded-xl text-white px-3 py-2' onClick={handleChallenge}> Sign Challenge</button>
                    </>
                }
            </div>
        </Layout>
    )
}