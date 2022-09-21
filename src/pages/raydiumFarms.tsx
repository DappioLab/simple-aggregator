import { useNavigator } from "contexts/NavigatorProvider";
import { Farm } from "../components/RaydiumFarm";
import { NextPage } from "next";
import Head from "next/head";
import { IFarmInfoWrapper, raydium } from "@dappio-wonderland/navigator";
import { useEffect, useState } from "react";

export const RaydiumFarms: NextPage = (props) => {
  const { raydiumFarms, raydiumPoolSetWithLpMintKey } = useNavigator();
  const [farmsWithPool, setFarmsWithPool] = useState<raydium.FarmInfoWrapper[]>(
    []
  );

  useEffect(() => {
    const farmsWithPool = raydiumFarms.filter((farm) => {
      return raydiumPoolSetWithLpMintKey.size > 0
        ? raydiumPoolSetWithLpMintKey.has(
            farm.farmInfo.poolLpTokenAccount.mint.toString()
          )
        : false;
    });
    setFarmsWithPool(farmsWithPool);
  }, [raydiumPoolSetWithLpMintKey]);

  return (
    <div>
      <Head>
        <title>Solana Scaffold</title>
        <meta name="description" content="Farms" />
      </Head>
      <div className="md:hero mx-auto p-4">
        <div className="md:hero-content flex flex-col">
          <h1 className="text-center text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-tr from-[#9945FF] to-[#14F195]">
            Raydium Farms
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
                {farmsWithPool
                  .sort((a, b) =>
                    a.farmInfo.farmId
                      .toString()
                      .localeCompare(b.farmInfo.farmId.toString())
                  )
                  .map((farm) => (
                    <Farm
                      key={farm.farmInfo.farmId.toString()}
                      farm={farm}
                      pool={raydiumPoolSetWithLpMintKey.get(
                        farm.farmInfo.poolLpTokenAccount.mint.toString()
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

export default RaydiumFarms;
