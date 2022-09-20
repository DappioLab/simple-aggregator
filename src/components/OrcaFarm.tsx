import { FC, useCallback, useEffect, useState } from "react";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  TransactionSignature,
} from "@solana/web3.js";
import { notify } from "utils/notifications";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import useUserSOLBalanceStore from "stores/useUserSOLBalanceStore";
import { IFarmInfoWrapper, IPoolInfoWrapper, orca } from "../../navigator/src";
import {
  AddLiquidityParams,
  GatewayBuilder,
  HarvestParams,
  RemoveLiquidityParams,
  StakeParams,
  SupportedProtocols,
  SwapParams,
  UnstakeParams,
} from "../../gateway/ts";
import { AnchorWallet } from "utils/anchorWallet";
import * as anchor from "@project-serum/anchor";

interface FarmProps {
  farm: orca.FarmInfoWrapper;
  pool: orca.PoolInfoWrapper;
}

export const Farm: FC<FarmProps> = (props: FarmProps) => {
  const [apr, setApr] = useState(0);
  const { connection } = useConnection();
  const wallet = useWallet();
  const { getUserSOLBalance } = useUserSOLBalanceStore();

  // Get Farm
  const farm = props.farm;
  const farmInfo = farm.farmInfo;
  const farmId = farmInfo.farmId.toString();
  const lpMint = farmInfo.baseTokenMint.toString();
  const pool = props.pool;
  const poolInfo = pool.poolInfo;
  useEffect(() => {
    const getApr = async () => {
      // NOTICE: We mocked LP price and reward price here just for demo
      const aprs = await farm.getApr(false);
      return aprs;
    };
    getApr().then((apr) => setApr(apr));
  }, []);

  const zapIn = useCallback(async () => {
    if (!wallet.publicKey) {
      console.error("error", "Wallet not connected!");
      notify({
        type: "error",
        message: "error",
        description: "Wallet not connected!",
      });
      return;
    }

    const provider = new anchor.AnchorProvider(
      connection,
      new AnchorWallet(wallet),
      anchor.AnchorProvider.defaultOptions()
    );
    const zapInAmount = 10000; // USDC Amount

    // USDC to tokenA
    const swapParams1: SwapParams = {
      protocol: SupportedProtocols.Jupiter,
      fromTokenMint: new PublicKey(
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" // USDC
      ),
      toTokenMint: poolInfo.tokenAMint,
      amount: zapInAmount,
      slippage: 1,
    };
    // tokenA to tokenB
    const swapParams2: SwapParams = {
      protocol: SupportedProtocols.Jupiter,
      fromTokenMint: poolInfo.tokenAMint,
      toTokenMint: poolInfo.tokenBMint,
      amount: 0, // Notice: amount needs to be updated later
      slippage: 1,
    };
    const addLiquidityParams: AddLiquidityParams = {
      protocol: SupportedProtocols.Orca,
      poolId: poolInfo.poolId,
    };
    const stakeParams: StakeParams = {
      protocol: SupportedProtocols.Orca,
      farmId: farmInfo.farmId,
    };

    const gateway = new GatewayBuilder(provider);

    // 1st Swap
    await gateway.swap(swapParams1);
    const minOutAmount1 = gateway.params.swapMinOutAmount.toNumber();
    console.log(minOutAmount1);

    // 2nd Swap
    swapParams2.amount = minOutAmount1 / 2;
    await gateway.swap(swapParams2);
    const minOutAmount2 = gateway.params.swapMinOutAmount.toNumber();
    console.log(minOutAmount2);

    // Add Liquidity
    addLiquidityParams.tokenInAmount = minOutAmount2;
    await gateway.addLiquidity(addLiquidityParams);

    // Stake
    await gateway.stake(stakeParams);

    await gateway.finalize();
    const txs = gateway.transactions();

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
        sig = await connection.sendRawTransaction(tx.serialize(), {
          skipPreflight: true,
          commitment: "confirmed",
        } as unknown as anchor.web3.SendOptions);
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
        console.error("error", `Transaction failed! ${error?.message}`, sig);
      }
    }
    console.log("Txs are executed");
    console.log("======");

    getUserSOLBalance(wallet.publicKey, connection);
  }, [wallet.publicKey, connection, getUserSOLBalance]);

  const zapOut = useCallback(async () => {
    if (!wallet.publicKey) {
      console.error("error", "Wallet not connected!");
      notify({
        type: "error",
        message: "error",
        description: "Wallet not connected!",
      });
      return;
    }

    const provider = new anchor.AnchorProvider(
      connection,
      new AnchorWallet(wallet),
      anchor.AnchorProvider.defaultOptions()
    );

    // Get share amount
    const ledgerKey = await orca.infos.getFarmerId(
      farmInfo,
      provider.wallet.publicKey
    );
    const ledger = (await orca.infos.getFarmer(
      connection,
      ledgerKey
    )) as orca.FarmerInfo;
    const shareAmount = ledger.amount;

    const harvestParams: HarvestParams = {
      protocol: SupportedProtocols.Orca,
      farmId: farmInfo.farmId,
    };
    const unstakeParams: UnstakeParams = {
      protocol: SupportedProtocols.Orca,
      farmId: farmInfo.farmId,
      shareAmount,
    };
    const removeLiquidityParams: RemoveLiquidityParams = {
      protocol: SupportedProtocols.Orca,
      poolId: poolInfo.poolId,
      singleToTokenMint: poolInfo.tokenAMint,
    };

   let aOut = new orca.PoolInfoWrapper(poolInfo,).getAOutAmount(

    // tokenA to USDC
    const swapParams2: SwapParams = {
      protocol: SupportedProtocols.Jupiter,
      fromTokenMint: poolInfo.tokenAMint,
      toTokenMint: new PublicKey(
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" // USDC
      ),
      amount: , // Notice: This amount needs to be updated later
      slippage: 3,
    };

    const gateway = new GatewayBuilder(provider);

    await gateway.harvest(harvestParams);
    await gateway.unstake(unstakeParams);
    await gateway.removeLiquidity(removeLiquidityParams);

    // 1st Swap
    await gateway.swap(swapParams1);
    const minOutAmount = gateway.params.swapMinOutAmount.toNumber();
    swapParams2.amount = minOutAmount;
    console.log(minOutAmount);

    // 2nd Swap
    await gateway.swap(swapParams2);

    await gateway.finalize();
    const txs = gateway.transactions();

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
        sig = await connection.sendRawTransaction(tx.serialize(), {
          skipPreflight: true,
          commitment: "confirmed",
        } as unknown as anchor.web3.SendOptions);
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
        console.error("error", `Transaction failed! ${error?.message}`, sig);
      }
    }
    console.log("Txs are executed");
    console.log("======");

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
        <button className="btn btn-warning" onClick={zapOut}>
          Zap Out
        </button>
      </td>
    </tr>
  );
};
