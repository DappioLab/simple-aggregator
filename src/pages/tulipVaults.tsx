import { useNavigator } from "contexts/NavigatorProvider";
import { Vault } from "components/TulipVault";
import { NextPage } from "next";
import Head from "next/head";
import { tulip } from "@dappio-wonderland/navigator";
import { useEffect, useState } from "react";

export const TulipVaults: NextPage = (props) => {
  const { tulipVaults, raydiumPoolSetWithLpMintKey } = useNavigator();
  const [vaultsWithPool, setVaultsWithPool] = useState<
    tulip.VaultInfoWrapper[]
  >([]);

  useEffect(() => {
    const vaultsWithPool = tulipVaults.filter((vault) => {
      return raydiumPoolSetWithLpMintKey.size > 0
        ? raydiumPoolSetWithLpMintKey.has(
            vault.vaultInfo.base.underlyingMint.toString()
          )
        : false;
    });
    setVaultsWithPool(vaultsWithPool);
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
            Tulip Vaults
          </h1>
          {/* CONTENT GOES HERE */}
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Vault ID</th>
                  <th>LP Token</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {vaultsWithPool
                  .sort((a, b) =>
                    a.vaultInfo.vaultId
                      .toString()
                      .localeCompare(b.vaultInfo.vaultId.toString())
                  )
                  .map((vault) => (
                    <Vault
                      key={vault.vaultInfo.vaultId.toString()}
                      vault={vault}
                      pool={raydiumPoolSetWithLpMintKey.get(
                        vault.vaultInfo.base.underlyingMint.toString()
                      )}
                    ></Vault>
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

export default TulipVaults;
