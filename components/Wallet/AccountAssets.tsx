import { IAssetData } from "../../helpers/types";
import { formatBigNumWithDecimals } from "../../helpers/utilities";

const AccountAssets = (props: { assets: IAssetData[] }) => {
  const { assets } = props;

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
    <div>
      <div key={nativeCurrency.id} className="flex mx-5">
        <p>Asset Name: &nbsp; {nativeCurrency.name}</p>
        <div className="flex-grow" />
        <p>{`${formatBigNumWithDecimals(nativeCurrency.amount, nativeCurrency.decimals)} ${nativeCurrency.unitName || "units"}`}</p>
      </div>

      {tokens.map(token => (
        <div key={token.id} className="flex mx-5">
          <p>Asset Name: &nbsp; {token.name}</p>
          <div className="flex-grow" />
          <p>{`${formatBigNumWithDecimals(token.amount, token.decimals)} ${token.unitName || "units"}`}</p>
        </div>
      ))}
    </div>
  );
};

export default AccountAssets;
