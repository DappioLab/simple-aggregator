import { FC, useCallback, useEffect, useState } from "react";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  TransactionSignature,
} from "@solana/web3.js";
import { notify } from "utils/notifications";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import useUserSOLBalanceStore from "stores/useUserSOLBalanceStore";
import {
  IFarmInfoWrapper,
  IPoolInfoWrapper,
  raydium,
} from "../../navigator/src";
import {
  AddLiquidityParams,
  GatewayBuilder,
  StakeParams,
  SupportedProtocols,
  SwapParams,
} from "../../gateway/ts";
import { AnchorWallet } from "utils/anchorWallet";
import * as anchor from "@project-serum/anchor";

interface FarmProps {
  farm: IFarmInfoWrapper;
  pool: IPoolInfoWrapper;
}

export const Farm: FC<FarmProps> = (props: FarmProps) => {
  const [apr, setApr] = useState(0);
  const { connection } = useConnection();
  const wallet = useWallet();
  const { getUserSOLBalance } = useUserSOLBalanceStore();

  // Get Farm
  const farm = props.farm as raydium.FarmInfoWrapper;
  const farmInfo = farm.farmInfo;
  const farmId = farmInfo.farmId.toString();
  const lpMint = farmInfo.poolLpTokenAccount.mint.toString();
  const pool = props.pool as raydium.PoolInfoWrapper;
  const poolInfo = pool.poolInfo;

  useEffect(() => {
    const getApr = async () => {
      // NOTICE: We mocked LP price and reward price here just for demo
      const aprs = await farm.getApr(connection, 5, 1, 2);
      return aprs.length > 1 ? aprs[1] : aprs[0];
    };
    getApr().then((apr) => setApr(apr));
  }, []);

  const zapIn = useCallback(async () => {
    if (!wallet.publicKey) {
      console.log("error", "Wallet not connected!");
      notify({
        type: "error",
        message: "error",
        description: "Wallet not connected!",
      });
      return;
    }

    ////
    const provider = new anchor.AnchorProvider(
      connection,
      new AnchorWallet(wallet),
      anchor.AnchorProvider.defaultOptions()
    );
    const zapInAmount = 10000; // USDC Amount
    const swapParams: SwapParams = {
      protocol: SupportedProtocols.Jupiter,
      fromTokenMint: new PublicKey(
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" // USDC
      ),
      toTokenMint: poolInfo.tokenAMint,
      amount: zapInAmount / 2, // Swap half of the fromToken to proceed zapIn
      slippage: 1,
    };
    const addLiquidityParams: AddLiquidityParams = {
      protocol: SupportedProtocols.Raydium,
      poolId: poolInfo.poolId,
    };
    const stakeParams: StakeParams = {
      protocol: SupportedProtocols.Raydium,
      farmId: farmInfo.farmId,
      version: farmInfo.version,
    };

    const gateway = new GatewayBuilder(provider);

    await gateway.swap(swapParams);
    console.log(gateway.params.swapMinOutAmount.toNumber());
    // Work-around
    addLiquidityParams.tokenInAmount =
      gateway.params.swapMinOutAmount.toNumber();
    await gateway.addLiquidity(addLiquidityParams);
    await gateway.stake(stakeParams);

    await gateway.finalize();

    console.log(gateway.params);
    // console.log(`swapInAmount: ${gateway.params.swapInAmount}`);
    // console.log(`swapMinOutAmount: ${gateway.params.swapMinOutAmount}`);

    const txs = gateway.transactions();
    console.log(txs.length);

    const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    txs.forEach((tx) => {
      tx.recentBlockhash = recentBlockhash;
      tx.feePayer = wallet.publicKey;
    });

    const signTxs = await provider.wallet.signAllTransactions(txs);

    console.log("======");
    console.log("Txs are sent...");
    for (let tx of signTxs) {
      let sig: string = "";
      try {
        sig = await connection.sendRawTransaction(tx.serialize());
        await connection.confirmTransaction(sig, connection.commitment);

        notify({
          type: "success",
          message: "Transaction is executed successfully!",
          txid: sig,
        });
      } catch (error: any) {
        notify({
          type: "error",
          message: `Transaction failed!`,
          description: error?.message,
          txid: sig,
        });
        console.log("error", `Transaction failed! ${error?.message}`, sig);
      }
    }
    console.log("Txs are executed");
    console.log("======");
    ////

    getUserSOLBalance(wallet.publicKey, connection);
  }, [wallet.publicKey, connection, getUserSOLBalance]);

  return (
    <tr>
      <th>
        {farmId.slice(0, 5)}...{farmId.slice(farmId.length - 5)}
      </th>
      <td>
        {lpMint.slice(0, 5)}...{lpMint.slice(lpMint.length - 5)}
      </td>
      <td>{apr}</td>
      <td>
        <button className="btn btn-info" onClick={zapIn}>
          Zap In
        </button>
        &nbsp;
        <button className="btn btn-warning" onClick={zapIn}>
          Zap Out
        </button>
      </td>
    </tr>
    // <div>
    //   <h6 onClick={onClick}>{props.farmId.toString()}</h6>
    // </div>
  );
};
