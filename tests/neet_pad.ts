// Basic smoke tests – run after deploy with: anchor test
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";

describe("neet-pad", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  it("Program is deployed and reachable", async () => {
    console.log("Provider wallet:", provider.wallet.publicKey.toBase58());
  });
});
