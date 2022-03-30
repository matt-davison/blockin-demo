import * as React from "react";
import WalletConnect from "@walletconnect/client";
import QRCodeModal from "algorand-walletconnect-qrcode-modal";
import { IInternalEvent } from "@walletconnect/types";
import { formatJsonRpcRequest } from "@json-rpc-tools/utils";
import algosdk from "algosdk";
import Modal from "./Modal";
import { apiGetAccountAssets, apiSubmitTransactions, ChainType } from "../../helpers/api";
import { IAssetData, IWalletTransaction, SignTxnParams } from "../../helpers/types";
import { Scenario, scenarios, signTxnWithTestAccount } from "../../scenarios";
import { ellipseAddress, formatBigNumWithDecimals } from "helpers/utilities";
import { useState } from "react";

interface IResult {
  method: string;
  body: Array<
    Array<{
      txID: string;
      signingAddress?: string;
      signature: string;
    } | null>
  >;
}

interface IAppState {
  connector: WalletConnect | null;
  fetching: boolean;
  connected: boolean;
  showModal: boolean;
  pendingRequest: boolean;
  signedTxns: Uint8Array[][] | null;
  pendingSubmissions: Array<number | Error>;
  uri: string;
  accounts: string[];
  address: string;
  result: IResult | null;
  chain: ChainType;
  assets: IAssetData[];
}

const INITIAL_STATE: IAppState = {
  connector: null,
  fetching: false,
  connected: false,
  showModal: false,
  pendingRequest: false,
  signedTxns: null,
  pendingSubmissions: [],
  uri: "",
  accounts: [],
  address: "",
  result: null,
  chain: ChainType.TestNet,
  assets: [],
};

declare global {
  // tslint:disable-next-line
  interface Window {
    blockies: any;
  }
}

const Wallet = () => {
  const [state, setState] = useState<IAppState>({ ...INITIAL_STATE });

  const walletConnectInit = async () => {
    // bridge url
    const bridge = "https://bridge.walletconnect.org";

    // create new connector
    const connector = new WalletConnect({ bridge, qrcodeModal: QRCodeModal });

    await setState((prevState: IAppState) => {
      return { ...prevState, connector };
    });

    // check if already connected
    if (!connector.connected) {
      // create new session
      await connector.createSession();
    }

    // subscribe to events
    await subscribeToEvents();
  };

  const subscribeToEvents = () => {
    const { connector } = state;
    if (!connector) {
      return;
    }

    connector.on("session_update", async (error: any, payload: any) => {
      console.log(`connector.on("session_update")`);

      if (error) {
        throw error;
      }

      const { accounts } = payload.params[0];
      onSessionUpdate(accounts);
    });

    connector.on("connect", (error: any, payload: any) => {
      console.log(`connector.on("connect")`);

      if (error) {
        throw error;
      }

      onConnect(payload);
    });

    connector.on("disconnect", (error: any, payload: any) => {
      console.log(`connector.on("disconnect")`);

      if (error) {
        throw error;
      }

      onDisconnect();
    });

    if (connector.connected) {
      const { accounts } = connector;
      const address = accounts[0];
      setState((prevState: IAppState) => {
        return { ...prevState, connected: true, accounts, address };
      });
      onSessionUpdate(accounts);
    }

    setState((prevState: IAppState) => {
      return { ...prevState, connector };
    });
  };

  const killSession = async () => {
    const { connector } = state;
    if (connector) {
      connector.killSession();
    }
    resetApp();
  };

  const chainUpdate = (newChain: ChainType) => {
    setState((prevState: IAppState) => {
      return { ...prevState, chain: newChain };
    });
    getAccountAssets();
  };

  const resetApp = async () => {
    await setState({ ...INITIAL_STATE });
  };

  const onConnect = async (payload: IInternalEvent) => {
    const { accounts } = payload.params[0];
    const address = accounts[0];
    await setState((prevState: IAppState) => {
      return { ...prevState, connected: true, accounts, address };
    });
    getAccountAssets();
  };

  const onDisconnect = async () => {
    resetApp();
  };

  const onSessionUpdate = async (accounts: string[]) => {
    const address = accounts[0];
    await setState((prevState: IAppState) => {
      return { ...prevState, accounts, address };
    });
    await getAccountAssets();
  };

  const getAccountAssets = async () => {
    const { address, chain } = state;
    setState((prevState: IAppState) => {
      return { ...prevState, fetching: true };
    });

    try {
      // get account balances
      const assets = await apiGetAccountAssets(chain, address);

      await setState((prevState: IAppState) => {
        return { ...prevState, fetching: false, address, assets };
      });
    } catch (error) {
      console.error(error);
      await setState((prevState: IAppState) => {
        return { ...prevState, fetching: false };
      });
    }
  };

  const toggleModal = () =>
    setState((prevState: IAppState) => {
      return {
        ...prevState,
        showModal: !state.showModal,
        pendingSubmissions: [],
      }
    })

  const signTxnScenario = async (scenario: Scenario) => {
    const { connector, address, chain } = state;

    if (!connector) {
      return;
    }

    try {
      const txnsToSign = await scenario(chain, address);

      // open modal
      toggleModal();

      // toggle pending request indicator
      setState((prevState: IAppState) => {
        return { ...prevState, pendingRequest: true };
      });

      const flatTxns = txnsToSign.reduce((acc, val) => acc.concat(val), []);

      const walletTxns: IWalletTransaction[] = flatTxns.map(
        ({ txn, signers, authAddr, message }) => ({
          txn: Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString("base64"),
          signers, // TODO: put auth addr in signers array
          authAddr,
          message,
        }),
      );

      // sign transaction
      const requestParams: SignTxnParams = [walletTxns];
      const request = formatJsonRpcRequest("algo_signTxn", requestParams);
      const result: Array<string | null> = await connector.sendCustomRequest(request);

      console.log("Raw response:", result);

      const indexToGroup = (index: number) => {
        for (let group = 0; group < txnsToSign.length; group++) {
          const groupLength = txnsToSign[group].length;
          if (index < groupLength) {
            return [group, index];
          }

          index -= groupLength;
        }

        throw new Error(`Index too large for groups: ${index}`);
      };

      const signedPartialTxns: Array<Array<Uint8Array | null>> = txnsToSign.map(() => []);
      result.forEach((r, i) => {
        const [group, groupIndex] = indexToGroup(i);
        const toSign = txnsToSign[group][groupIndex];

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

      const signedTxns: Uint8Array[][] = signedPartialTxns.map(
        (signedPartialTxnsInternal, group) => {
          return signedPartialTxnsInternal.map((stxn, groupIndex) => {
            if (stxn) {
              return stxn;
            }

            return signTxnWithTestAccount(txnsToSign[group][groupIndex].txn);
          });
        },
      );

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
          const txn = (signedTxn.txn as unknown) as algosdk.Transaction;
          const txID = txn.txID();
          const unsignedTxID = txnsToSign[group][i].txn.txID();

          if (txID !== unsignedTxID) {
            throw new Error(
              `Signed transaction at index ${i} differs from unsigned transaction. Got ${txID}, expected ${unsignedTxID}`,
            );
          }

          if (!signedTxn.sig) {
            throw new Error(`Signature not present on transaction at index ${i}`);
          }

          return {
            txID,
            signingAddress: signedTxn.sgnr ? algosdk.encodeAddress(signedTxn.sgnr) : undefined,
            signature: Buffer.from(signedTxn.sig).toString("base64"),
          };
        });
      });

      console.log("Signed txn info:", signedTxnInfo);

      // format displayed result
      const formattedResult: IResult = {
        method: "algo_signTxn",
        body: signedTxnInfo,
      };

      // display result
      setState((prevState: IAppState) => {
        return {
          ...prevState,
          connector,
          pendingRequest: false,
          signedTxns,
          result: formattedResult,
        };
      });
    } catch (error) {
      console.error(error);
      setState((prevState: IAppState) => {
        return { ...prevState, connector, pendingRequest: false, result: null };
      });
    }
  };

  const submitSignedTransaction = async () => {
    const { signedTxns, chain } = state;
    if (signedTxns == null) {
      throw new Error("Transactions to submit are null");
    }

    setState((prevState: IAppState) => {
      return { ...prevState, pendingSubmissions: signedTxns.map(() => 0) };
    });

    signedTxns.forEach(async (signedTxn: any, index: any) => {
      try {
        const confirmedRound = await apiSubmitTransactions(chain, signedTxn);

        setState((prevState: IAppState) => {
          return {
            ...prevState,
            pendingSubmissions: prevState.pendingSubmissions.map((v: any, i: any) => {
              if (index === i) {
                return confirmedRound;
              }
              return v;
            }),
          };
        });

        console.log(`Transaction confirmed at round ${confirmedRound}`);
      } catch (err) {
        setState((prevState: IAppState) => {
          return {
            ...prevState,
            pendingSubmissions: prevState.pendingSubmissions.map((v: any, i: any) => {
              if (index === i) {
                return err;
              }
              return v;
            }),
          };
        });

        console.error(`Error submitting transaction at index ${index}:`, err);
      }
    });
  };

  const stringToChainType = (s: string): ChainType => {
    switch (s) {
      case ChainType.MainNet.toString():
        return ChainType.MainNet;
      case ChainType.TestNet.toString():
        return ChainType.TestNet;
      default:
        throw new Error(`Unknown chain selected: ${s}`);
    }
  };

  const {
    chain,
    assets,
    address,
    connected,
    fetching,
    showModal,
    pendingRequest,
    pendingSubmissions,
    result,
  } = state;

  const nativeCurrency = assets.find((asset: IAssetData) => asset && asset.id === 0) || {
    id: 0,
    amount: BigInt(0),
    creator: "",
    frozen: false,
    decimals: 6,
    name: "Algo",
    unitName: "Algo",
  };

  const tokens = assets.filter((asset: IAssetData) => asset && asset.id !== 0);

  return (
    <>
      <div className="relative">
        {fetching && <p>Loading...</p>}

        <div className="border-2 border-black">
          {!connected || !address ? (
            <>
              <div className="bg-gray-100">
                <h3>Sign in to WalletConnect to get started</h3>
                <button
                  onClick={walletConnectInit}
                  className="bg-blue-500 rounded-xl text-white px-3 py-2 my-3"
                >
                  Connect to WalletConnect
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex bg-blue-200 px-3 py-2">
                <div className="text-left">
                  <p>Connected to:</p>
                  <select
                    onChange={event => chainUpdate(stringToChainType(event.target.value))}
                    value={chain}
                  >
                    <option value={ChainType.TestNet}>Algorand TestNet</option>
                    <option value={ChainType.MainNet}>Algorand MainNet</option>
                  </select>
                </div>
                <div className="flex-grow" />
                <div>
                  {/* <Image src={imgUrl} alt={address} /> */}
                  <p>{ellipseAddress(address)}</p>
                  <button
                    onClick={killSession}
                    className="bg-red-500 px-3 py-2 font-bold rounded-xl"
                  >
                    Disconnect
                  </button>
                </div>
              </div>

              <div className="border-2 border-black">
                <h3>Balances</h3>
                <div className="bg-gray-200">
                  <div key={nativeCurrency.id} className="flex mx-5">
                    <p>Asset Name: &nbsp; {nativeCurrency.name}</p>
                    <div className="flex-grow" />
                    <p>{`${formatBigNumWithDecimals(
                      nativeCurrency.amount,
                      nativeCurrency.decimals,
                    )} ${nativeCurrency.unitName || "units"}`}</p>
                  </div>

                  {tokens.map((token: any) => (
                    <div key={token.id} className="flex mx-5">
                      <p>Asset Name: &nbsp; {token.name}</p>
                      <div className="flex-grow" />
                      <p>{`${formatBigNumWithDecimals(
                        token.amount,
                        token.decimals,
                      )} ${token.unitName || "units"}`}</p>
                    </div>
                  ))}
                </div>

                <h3>Actions</h3>
                <div className="bg-gray-200">
                  {scenarios.map(({ name, scenario }) => (
                    <button
                      className="bg-blue-500 rounded-xl text-white px-3 py-2 m-3"
                      key={name}
                      onClick={() => signTxnScenario(scenario)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <Modal show={showModal} toggleModal={toggleModal}>
          {pendingRequest ? (
            <div className=" relative">
              <h1>Pending Call Request</h1>
              <div>
                <p>Loading...</p>
                <p>Approve or reject request using your wallet</p>
              </div>
            </div>
          ) : result ? (
            <div className="relative">
              <h1>Call Request Approved</h1>
              <table>
                <tr>
                  <th>Method</th>
                  <th>{result.method}</th>
                </tr>
                {result.body.map((signedTxns: any, index: any) => (
                  <tr key={index}>
                    <th>{`Atomic group ${index}`}</th>
                    <th>
                      {signedTxns.map((txn: any, txnIndex: any) => (
                        <div key={txnIndex}>
                          {!!txn?.txID && <p>TxID: {txn.txID}</p>}
                          {!!txn?.signature && <p>Sig: {txn.signature}</p>}
                          {!!txn?.signingAddress && <p>AuthAddr: {txn.signingAddress}</p>}
                        </div>
                      ))}
                    </th>
                  </tr>
                ))}
              </table>
              <button
                onClick={() => submitSignedTransaction()}
                disabled={pendingSubmissions.length !== 0}
              >
                Submit transaction to network.
              </button>
              {pendingSubmissions.map((submissionInfo: any, index: any) => {
                const key = `${index}:${
                  typeof submissionInfo === "number" ? submissionInfo : "err"
                }`;
                const prefix = `Txn Group ${index}: `;
                let content: string;

                if (submissionInfo === 0) {
                  content = "Submitting...";
                } else if (typeof submissionInfo === "number") {
                  content = `Confirmed at round ${submissionInfo}`;
                } else {
                  content = "Rejected by network. See console for more information.";
                }

                return <h1 key={key}>{prefix + content}</h1>;
              })}
            </div>
          ) : (
            <div className="relative">
              <h1>Call Request Rejected</h1>
            </div>
          )}
        </Modal>
      </div>
    </>
  );
};

export default Wallet;
