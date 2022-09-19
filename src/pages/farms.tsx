import { useFarms } from "contexts/FarmsProvider";
import { Farm } from "../components/Farm";
import { NextPage } from "next";
import Head from "next/head";
import { IFarmInfoWrapper, raydium } from "../../navigator/src";
import { useEffect, useState } from "react";

export const Farms: NextPage = (props) => {
  const { farms, poolSetWithLpMintKey } = useFarms();
  const [farmsWithPool, setFarmsWithPool] = useState<IFarmInfoWrapper[]>([]);

  useEffect(() => {
    const farmsWithPool = farms.filter((farm) => {
      return poolSetWithLpMintKey.get(
        (farm.farmInfo as raydium.FarmInfo).poolLpTokenAccount.mint.toString()
      );
      // return Boolean(result);
    });
    setFarmsWithPool(farmsWithPool);
  }, [poolSetWithLpMintKey]);

  return (
    <div>
      <Head>
        <title>Solana Scaffold</title>
        <meta name="description" content="Farms" />
      </Head>
      <div className="md:hero mx-auto p-4">
        <div className="md:hero-content flex flex-col">
          <h1 className="text-center text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-tr from-[#9945FF] to-[#14F195]">
            Farms
          </h1>
          {/* CONTENT GOES HERE */}
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Farm ID</th>
                  <th>LP Token</th>
                  <th>APY</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {farmsWithPool.map((farm) => (
                  <Farm
                    key={farm.farmInfo.farmId.toString()}
                    farm={farm}
                    pool={poolSetWithLpMintKey.get(
                      (
                        farm.farmInfo as raydium.FarmInfo
                      ).poolLpTokenAccount.mint.toString()
                    )}
                  ></Farm>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-center"></div>
        </div>
      </div>
    </div>
  );
};

export default Farms;
