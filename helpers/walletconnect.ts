import { formatJsonRpcRequest } from "@json-rpc-tools/utils";
import WalletConnect from "@walletconnect/client";
import QRCodeModal from "algorand-walletconnect-qrcode-modal";
import algosdk from "algosdk";

// Create a connector
export const connector = new WalletConnect({
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

export async function requestSigning(txns: algosdk.Transaction[], connector: WalletConnect, walletConnectMsg: string): Promise<Uint8Array[] | null> {
    const txnsToSign = txns.map(txn => {
        const encodedTxn = Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString("base64");

        return {
            txn: encodedTxn,
            message: walletConnectMsg,
        };
    });

    const requestParams = [txnsToSign];
    const request = formatJsonRpcRequest("algo_signTxn", requestParams);
    const result: Array<string | null> = await connector.sendCustomRequest(request);
    const decodedResult = result.map(element => {
        return element ? new Uint8Array(Buffer.from(element, "base64")) : null;
    });

    if (decodedResult != null) {
        const stxs: Uint8Array[] = []
        decodedResult.forEach((elem) => {
            if (elem != null) {
                stxs.push(elem)
            }
        });
        return stxs
    }
    return null
}