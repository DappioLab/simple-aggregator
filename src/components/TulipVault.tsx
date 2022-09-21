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
  tulip,
} from "../../navigator/src";
import {
  AddLiquidityParams,
  GatewayBuilder,
  HarvestParams,
  RemoveLiquidityParams,
  DepositParams,
  SupportedProtocols,
  SwapParams,
  WithdrawParams,
} from "../../gateway/ts";
import { AnchorWallet } from "utils/anchorWallet";
import * as anchor from "@project-serum/anchor";

interface VaultProps {
  vault: tulip.VaultInfoWrapper;
  pool: raydium.PoolInfoWrapper;
}

export const Vault: FC<VaultProps> = (props: VaultProps) => {
  const [apr, setApr] = useState(0);
  const { connection } = useConnection();
  const wallet = useWallet();
  const { getUserSOLBalance } = useUserSOLBalanceStore();

  // Get Farm
  const vault = props.vault;
  const vaultInfo = vault.vaultInfo;
  const vaultId = vaultInfo.vaultId.toString();
  const lpMint = vaultInfo.base.underlyingMint.toString();
  const pool = props.pool;
  const poolInfo = pool.poolInfo;

  useEffect(() => {
    const apr = vault.getApr();
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
      protocol: SupportedProtocols.Raydium,
      poolId: poolInfo.poolId,
    };
    const depositParams: DepositParams = {
      protocol: SupportedProtocols.Tulip,
      vaultId: vaultInfo.vaultId,
      depositAmount: 0, // Notice: amount will auto-update in gateway state after add liquidity
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
    await gateway.deposit(depositParams);

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
          skipPreflight: false,
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

    const depositorId = tulip.infos.getDepositorId(
      vaultInfo.vaultId,
      wallet.publicKey
    );
    const depositor = (await tulip.infos.getDepositor(
      connection,
      depositorId
    )) as tulip.DepositorInfo;

    const shareAmount = Math.floor(Number(depositor.shares) / 10);

    const withdrawParams: WithdrawParams = {
      protocol: SupportedProtocols.Tulip,
      vaultId: vaultInfo.vaultId,
      withdrawAmount: shareAmount,
    };
    const removeLiquidityParams: RemoveLiquidityParams = {
      protocol: SupportedProtocols.Raydium,
      poolId: poolInfo.poolId,
    };

    const { tokenAAmount: coinAmount } = pool.getTokenAmounts(shareAmount);
    // tokenA to tokenB
    const swapParams1: SwapParams = {
      protocol: SupportedProtocols.Jupiter,
      fromTokenMint: poolInfo.tokenAMint,
      toTokenMint: poolInfo.tokenBMint,
      amount: coinAmount, // swap coin to pc
      slippage: 3,
    };

    // tokenB to USDC
    const swapParams2: SwapParams = {
      protocol: SupportedProtocols.Jupiter,
      fromTokenMint: poolInfo.tokenBMint,
      toTokenMint: new PublicKey(
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" // USDC
      ),
      amount: 0, // Notice: This amount needs to be updated later
      slippage: 3,
    };

    const gateway = new GatewayBuilder(provider);

    await gateway.withdraw(withdrawParams);
    await gateway.removeLiquidity(removeLiquidityParams);

    // 1st Swap
    await gateway.swap(swapParams1);
    const minOutAmount = gateway.params.swapMinOutAmount.toNumber();
    swapParams2.amount = minOutAmount;

    // 2nd Swap
    if (
      poolInfo.tokenBMint.toString() !==
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" // USDC
    ) {
      await gateway.swap(swapParams2);
    }

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
          skipPreflight: false,
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
        {vaultId.slice(0, 5)}...{vaultId.slice(vaultId.length - 5)}
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
