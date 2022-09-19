import { PublicKey, Transaction, Keypair } from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";

export class AnchorWallet {
  readonly payer: Keypair;
  readonly publicKey: PublicKey;

  constructor(readonly wallet: WalletContextState) {
    // Never used dummy payer
    this.payer = Keypair.generate();
    this.publicKey = wallet.publicKey ? wallet.publicKey : PublicKey.default;
  }

  async signTransaction(tx: Transaction): Promise<Transaction> {
    return await this.wallet.signTransaction!(tx);
  }

  async signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
    return await this.wallet.signAllTransactions!(txs);
  }
}
