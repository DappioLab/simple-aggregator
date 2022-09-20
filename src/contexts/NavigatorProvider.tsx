import { useConnection } from "@solana/wallet-adapter-react";
import {
  createContext,
  FC,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { raydium } from "../../navigator/src";

export interface NavigatorContextState {
  raydiumFarms: raydium.FarmInfoWrapper[];
  raydiumPoolSetWithLpMintKey: Map<string, raydium.PoolInfoWrapper>;

  // TODO: Add Orca farms
  // orcaFarms: orca.FarmInfoWrapper[];
  // orcaPoolSetWithLpMintKey: Map<string, orca.PoolInfoWrapper>;

  // TODO: Add Tulip vaults
  // tulipVaults: tulip.VaultInfoWrapper[];
  // tulipPoolSetWithLpMintKey: Map<string, tulip.PoolInfoWrapper>;
}

export const FarmsContext = createContext<NavigatorContextState>(
  {} as NavigatorContextState
);

export function useFarms(): NavigatorContextState {
  return useContext(FarmsContext);
}

export const NavigatorProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { connection } = useConnection();
  const [raydiumFarms, setRaydiumFarms] = useState<raydium.FarmInfoWrapper[]>(
    []
  );
  const [raydiumPoolSetWithLpMintKey, setRaydiumPoolSetWithLpMintKey] =
    useState<Map<string, raydium.PoolInfoWrapper>>(
      {} as Map<string, raydium.PoolInfoWrapper>
    );

  // TODO: Add useState for Orca
  // TODO: Add useState for Tulip

  useEffect(() => {
    const getAllFarmsWrappers = async () => {
      return (await raydium.infos.getAllFarmWrappers(
        connection
      )) as raydium.FarmInfoWrapper[];
    };

    getAllFarmsWrappers().then((wrappers) => {
      setRaydiumFarms(wrappers);
    });

    const getAllPoolWrappers = async () => {
      const poolWrappers = await raydium.infos.getAllPoolWrappers(connection);

      return new Map<string, raydium.PoolInfoWrapper>(
        poolWrappers.map((wrapper) => [
          wrapper.poolInfo.lpMint.toString(),
          wrapper as raydium.PoolInfoWrapper,
        ])
      );
    };

    getAllPoolWrappers().then((poolSetResult) => {
      setRaydiumPoolSetWithLpMintKey(poolSetResult);
    });
  }, []);

  // TODO: Add useEffect for Orca
  // TODO: Add useEffect for Tulip

  return (
    <FarmsContext.Provider
      // TODO: Add value for Orca
      // TODO: Add value for Tulip
      value={{ raydiumFarms, raydiumPoolSetWithLpMintKey }}
    >
      {children}
    </FarmsContext.Provider>
  );
};
