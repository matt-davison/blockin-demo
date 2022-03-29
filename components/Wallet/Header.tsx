// import Image from 'next/image'
import * as PropTypes from "prop-types";
import { ellipseAddress } from "../../helpers/utilities";
import { ChainType } from "../../helpers/api";

interface IHeaderProps {
  killSession: () => unknown;
  connected: boolean;
  address: string;
  chain: ChainType;
  chainUpdate: (newChain: ChainType) => unknown;
}

function stringToChainType(s: string): ChainType {
  switch (s) {
    case ChainType.MainNet.toString():
      return ChainType.MainNet;
    case ChainType.TestNet.toString():
      return ChainType.TestNet;
    default:
      throw new Error(`Unknown chain selected: ${s}`);
  }
}

const Header = (props: IHeaderProps) => {
  const { killSession, connected, address, chain, chainUpdate } = props;
  // const seed = address.toLowerCase() || "";
  // const imgUrl = window.blockies
  //   .create({
  //     seed,
  //   })
  //   .toDataURL();

  return (
    <div className="border">
      {connected && (
        <div className="bg-gray-200">
          <p>
            Connected to: &nbsp;
            <select
              onChange={event => chainUpdate(stringToChainType(event.target.value))}
              value={chain}
            >
              <option value={ChainType.TestNet}>Algorand TestNet</option>
              <option value={ChainType.MainNet}>Algorand MainNet</option>
            </select>
          </p>
        </div>
      )}
      {address && (
        <div className="bg-gray-300">
          {/* <Image src={imgUrl} alt={address} /> */}
          <p>{ellipseAddress(address)}</p>
          <button onClick={killSession} className='bg-red-500 px-3 py-2 font-bold rounded-xl'>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};

Header.propTypes = {
  killSession: PropTypes.func.isRequired,
  address: PropTypes.string,
};

export default Header;
