import { useConnection } from "@solana/wallet-adapter-react";
import {
  createContext,
  FC,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  IFarmInfoWrapper,
  IPoolInfoWrapper,
  raydium,
} from "../../navigator/src";

export interface FarmsContextState {
  farms: IFarmInfoWrapper[];
  poolSetWithLpMintKey: Map<string, IPoolInfoWrapper>;
}

export const FarmsContext = createContext<FarmsContextState>(
  {} as FarmsContextState
);

export function useFarms(): FarmsContextState {
  return useContext(FarmsContext);
}

export const FarmsProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [farms, setFarms] = useState<IFarmInfoWrapper[]>([]);
  const [poolSetWithLpMintKey, setPoolSetWithLpMintKey] = useState<
    Map<string, IPoolInfoWrapper>
  >({} as Map<string, IPoolInfoWrapper>);
  const { connection } = useConnection();

  useEffect(() => {
    const getAllFarmsWrappers = async () => {
      return await raydium.infos.getAllFarmWrappers(connection);
    };

    getAllFarmsWrappers().then((wrappers) => {
      setFarms(wrappers);
    });

    const getAllPoolWrappers = async () => {
      const poolWrappers = await raydium.infos.getAllPoolWrappers(connection);

      return new Map<string, IPoolInfoWrapper>(
        poolWrappers.map((wrapper) => [
          wrapper.poolInfo.lpMint.toString(),
          wrapper,
        ])
      );
    };

    getAllPoolWrappers().then((poolSetResult) => {
      setPoolSetWithLpMintKey(poolSetResult);
    });
  }, []);

  return (
    <FarmsContext.Provider value={{ farms, poolSetWithLpMintKey }}>
      {children}
    </FarmsContext.Provider>
  );
};
