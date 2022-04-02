import { formatJsonRpcRequest } from "@json-rpc-tools/utils";
import WalletConnect from "@walletconnect/client";
import QRCodeModal from "algorand-walletconnect-qrcode-modal";

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
