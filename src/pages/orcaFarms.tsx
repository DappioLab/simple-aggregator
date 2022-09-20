import { useFarms } from "contexts/NavigatorProvider";
import { Farm } from "../components/RaydiumFarm";
import { NextPage } from "next";
import Head from "next/head";
import { IFarmInfoWrapper, raydium } from "../../navigator/src";
import { useEffect, useState } from "react";

export const OrcaFarms: NextPage = (props) => {
  // TODO: Add state for Orca

  return (
    <div>
      <Head>
        <title>Solana Scaffold</title>
        <meta name="description" content="Farms" />
      </Head>
      <div className="md:hero mx-auto p-4">
        <div className="md:hero-content flex flex-col">
          <h1 className="text-center text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-tr from-[#9945FF] to-[#14F195]">
            Orca Farms
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
              <tbody>{/* TODO: render farms here */}</tbody>
            </table>
          </div>
          <div className="text-center"></div>
        </div>
      </div>
    </div>
  );
};

export default OrcaFarms;
