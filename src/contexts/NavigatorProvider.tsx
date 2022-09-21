import { useConnection } from "@solana/wallet-adapter-react";
import {
  createContext,
  FC,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { raydium, orca, tulip } from "@dappio-wonderland/navigator";

export interface NavigatorContextState {
  raydiumFarms: raydium.FarmInfoWrapper[];
  raydiumPoolSetWithLpMintKey: Map<string, raydium.PoolInfoWrapper>;
  orcaFarms: orca.FarmInfoWrapper[];
  orcaPoolSetWithLpMintKey: Map<string, orca.PoolInfoWrapper>;

  tulipVaults: tulip.VaultInfoWrapper[];
}

export const NavigatorContext = createContext<NavigatorContextState>(
  {} as NavigatorContextState
);

export function useNavigator(): NavigatorContextState {
  return useContext(NavigatorContext);
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
  const [orcaFarms, setOrcaFarms] = useState<orca.FarmInfoWrapper[]>([]);
  const [orcaPoolSetWithLpMintKey, setOrcaPoolSetWithLpMintKey] = useState<
    Map<string, orca.PoolInfoWrapper>
  >({} as Map<string, orca.PoolInfoWrapper>);

  const [tulipVaults, setTulipVaults] = useState<tulip.VaultInfoWrapper[]>([]);

  useEffect(() => {
    {
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
    }
    {
      const getAllFarmsWrappers = async () => {
        return (await orca.infos.getAllFarmWrappers(
          connection
        )) as orca.FarmInfoWrapper[];
      };

      getAllFarmsWrappers().then((wrappers) => {
        setOrcaFarms(wrappers);
      });

      const getAllPoolWrappers = async () => {
        const poolWrappers = await orca.infos.getAllPoolWrappers(connection);

        return new Map<string, orca.PoolInfoWrapper>(
          poolWrappers.map((wrapper) => [
            wrapper.poolInfo.lpMint.toString(),
            wrapper as orca.PoolInfoWrapper,
          ])
        );
      };

      getAllPoolWrappers().then((poolSetResult) => {
        setOrcaPoolSetWithLpMintKey(poolSetResult);
      });
    }
  }, []);

  useEffect(() => {
    const getAllVaultsWrappers = async () => {
      return (await tulip.infos.getAllVaultWrappers(
        connection
      )) as tulip.VaultInfoWrapper[];
    };

    getAllVaultsWrappers().then((wrappers) => {
      setTulipVaults(wrappers);
    });
  }, []);

  return (
    <NavigatorContext.Provider
      value={{
        raydiumFarms,
        raydiumPoolSetWithLpMintKey,
        orcaFarms,
        orcaPoolSetWithLpMintKey,
        tulipVaults,
      }}
    >
      {children}
    </NavigatorContext.Provider>
  );
};
