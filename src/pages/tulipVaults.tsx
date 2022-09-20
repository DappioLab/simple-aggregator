import { useFarms } from "contexts/NavigatorProvider";
import { Farm } from "../components/RaydiumFarm";
import { NextPage } from "next";
import Head from "next/head";
import { IFarmInfoWrapper, raydium } from "../../navigator/src";
import { useEffect, useState } from "react";

export const TulipVaults: NextPage = (props) => {
  // TODO: Add state for Tulip
  return (
    <div>
      <Head>
        <title>Solana Scaffold</title>
        <meta name="description" content="Farms" />
      </Head>
      <div className="md:hero mx-auto p-4">
        <div className="md:hero-content flex flex-col">
          <h1 className="text-center text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-tr from-[#9945FF] to-[#14F195]">
            Tulip Vaults
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
              <tbody>{/* TODO: Render vaults here */}</tbody>
            </table>
          </div>
          <div className="text-center"></div>
        </div>
      </div>
    </div>
  );
};

export default TulipVaults;
