import { FC, useCallback, useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { notify } from "utils/notifications";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import useUserSOLBalanceStore from "stores/useUserSOLBalanceStore";
import { AnchorWallet } from "utils/anchorWallet";
import * as anchor from "@project-serum/anchor";
import { raydium as protocol } from "@dappio-wonderland/navigator";
import {
  AddLiquidityParams,
  GatewayBuilder,
  HarvestParams,
  RemoveLiquidityParams,
  StakeParams,
  SupportedProtocols,
  SwapParams,
  UnstakeParams,
  WSOL,
} from "@dappio-wonderland/gateway";

interface FarmProps {
  farm: protocol.FarmInfoWrapper;
  pool: protocol.PoolInfoWrapper;
}

const protocolType = SupportedProtocols.Raydium;

export const Farm: FC<FarmProps> = (props: FarmProps) => {
  const [apr, setApr] = useState(0);
  const { connection } = useConnection();
  const wallet = useWallet();
  const { getUserSOLBalance } = useUserSOLBalanceStore();

  // Get Farm
  const farm = props.farm;
  const farmInfo = farm.farmInfo;
  const farmId = farmInfo.farmId.toString();
  const lpMint = farmInfo.poolLpTokenAccount.mint.toString();
  const pool = props.pool;
  const poolInfo = pool.poolInfo;
  useEffect(() => {
    // NOTICE: We mocked LP price and reward price here just for demo
    const aprs = farm.getAprs(5, 1, 2);
    const apr = aprs.length > 1 ? aprs[1] : aprs[0];
    setApr(apr);
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
    const zapInAmount = 10000; // WSOL Amount

    // SOL to tokenA
    const swapParams1: SwapParams = {
      protocol: SupportedProtocols.Jupiter,
      fromTokenMint: new PublicKey(WSOL),
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
      protocol: protocolType,
      poolId: poolInfo.poolId,
    };
    const stakeParams: StakeParams = {
      protocol: protocolType,
      farmId: farmInfo.farmId,
      version: farmInfo.version,
    };

    const gateway = new GatewayBuilder(provider);

    // 1st Swap
    await gateway.swap(swapParams1);
    const minOutAmount1 = gateway.params.swapMinOutAmount.toNumber();

    // 2nd Swap
    swapParams2.amount = minOutAmount1 / 2;
    await gateway.swap(swapParams2);
    const minOutAmount2 = gateway.params.swapMinOutAmount.toNumber();

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
        console.log(
          "NOTICE: paste the output to Transaction Inspector in Solana Explorer for debugging"
        );
        console.log(tx.serializeMessage().toString("base64"));
        console.error("error", `Transaction failed! ${error?.message}`, sig);
        break;
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
    const ledgerKey = await protocol.infos.getFarmerId(
      farmInfo,
      provider.wallet.publicKey,
      farmInfo.version
    );
    const ledger = (await protocol.infos.getFarmer(
      connection,
      ledgerKey,
      farmInfo.version
    )) as protocol.FarmerInfo;
    const shareAmount = ledger.amount;
    const { tokenAAmount, tokenBAmount } = await pool.getTokenAmounts(
      shareAmount
    );

    const harvestParams: HarvestParams = {
      protocol: protocolType,
      farmId: farmInfo.farmId,
      version: farmInfo.version,
    };
    const unstakeParams: UnstakeParams = {
      protocol: protocolType,
      farmId: farmInfo.farmId,
      shareAmount,
      version: farmInfo.version,
    };
    const removeLiquidityParams: RemoveLiquidityParams = {
      protocol: protocolType,
      poolId: poolInfo.poolId,
    };
    // tokenB to tokenA
    const swapParams1: SwapParams = {
      protocol: SupportedProtocols.Jupiter,
      fromTokenMint: poolInfo.tokenBMint,
      toTokenMint: poolInfo.tokenAMint,
      amount: tokenBAmount, // swap coin to pc
      slippage: 3,
    };

    // tokenA to SOL
    const swapParams2: SwapParams = {
      protocol: SupportedProtocols.Jupiter,
      fromTokenMint: poolInfo.tokenAMint,
      toTokenMint: new PublicKey(WSOL),
      amount: 0, // Notice: This amount needs to be updated later
      slippage: 10,
    };

    const gateway = new GatewayBuilder(provider);

    await gateway.harvest(harvestParams);
    await gateway.unstake(unstakeParams);
    await gateway.removeLiquidity(removeLiquidityParams);

    // 1st Swap
    await gateway.swap(swapParams1);
    const minOutAmount = gateway.params.swapMinOutAmount.toNumber();
    swapParams2.amount = minOutAmount + tokenAAmount;
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
        console.log(
          "NOTICE: paste the output to Transaction Inspector in Solana Explorer for debugging"
        );
        console.log(tx.serializeMessage().toString("base64"));
        console.error("error", `Transaction failed! ${error?.message}`, sig);
        break;
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
      <td>{apr.toFixed(2) + "%"}</td>
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
