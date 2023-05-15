import type * as nt from 'nekoton-wasm';
import {Address, Signer, toNano, WalletTypes} from "locklift";
const fs = require('fs');

export type nReceiver = {
    addr: Address,
    proc: number
}

export type nSigner = {
    id: number,
    public: string,
    secret: string
}

let array_msigs: any;
async function main() {
    const data = fs.readFileSync("data_example.json", 'utf8');
    if (data) array_msigs = JSON.parse(data);

    if (array_msigs.msigs) {
        for (const elMsigs of array_msigs.msigs) {
            const msigAddress = new Address(elMsigs.address);

            const dataForSign: nSigner[] = [];
            if(elMsigs.signers) {
                for (const elSign of elMsigs.signers) {
                    const datS: nSigner = {
                        id: elSign.id,
                        public: elSign.public,
                        secret: elSign.secret
                    }
                    dataForSign.push(datS);
                }
            }

            const dataForTransfer: nReceiver[] = [];
            if (elMsigs.receivers) {
                for (const elReceiver of elMsigs.receivers) {
                    const dataR: nReceiver = {
                        addr: new Address(elReceiver.address),
                        proc: elReceiver.proc
                    }
                    dataForTransfer.push(dataR);
                }
            }

            console.log("Check data for transfer...")
            if (dataForTransfer.length == 0) {
                return
            }

            let startNum = 0;
            for (let i in dataForTransfer) {
                startNum += dataForTransfer[i].proc;

                if (startNum > 100) {
                    console.log("Procentage above 100%!");
                    return
                }
            }
            console.log("Transfer data");

            for (const kpI in dataForSign) {
                const kp:nt.Ed25519KeyPair = {
                    publicKey: dataForSign[kpI].public,
                    secretKey: dataForSign[kpI].secret,
                }

                await locklift.keystore.addKeyPair(dataForSign[kpI].id.toString(), kp);
            }

            const signer1 = await locklift.keystore.getSigner(dataForSign[0].id.toString());
            const signer2 = await locklift.keystore.getSigner(dataForSign[1].id.toString());
            const signer3 = await locklift.keystore.getSigner(dataForSign[2].id.toString());

            const msigAccount = await locklift.factory.accounts.addExistingAccount({
                publicKey: signer1?.publicKey,
                type: WalletTypes.MsigAccount,
                mSigType:"SafeMultisig",
                address: msigAddress
            });

            const msigContract = locklift.factory.getDeployedContract(
                "SafeMultisigWallet",
                msigAddress,
            )

            let balance = await locklift.provider.getBalance(msigAddress);
            console.log(`Address: ${msigAddress} balance: ${Number(balance)/1000000000}`);
            if (Number(balance)/1000000000 < elMsigs.minimum_balance) {
                console.log(`Balance address is very low: ${Number(balance)/1000000000}. Transfer do it from ${elMsigs.minimum_balance} Ever. Work is stop.`);
                console.log(` `)
                continue
            }

            let balanceNow: number = (Number(balance)/1000000000) - elMsigs.minimum_reserve;
            let balanceTransfers: number = balanceNow;
            console.log("Create transcations...");
            let iI:number = 1;
            for (let i in dataForTransfer) {
                if (balanceTransfers == 0) {
                    break;
                }

                console.log(`Check ${iI} constructor....`);
                let proc = dataForTransfer[i].proc;
                let addr = dataForTransfer[i].addr;

                let balanceForTransfer = (balanceNow * proc)/100;
                if (balanceForTransfer >= balanceTransfers) {
                    balanceForTransfer = balanceTransfers;
                    balanceTransfers = 0;
                }

                balanceTransfers -= balanceForTransfer;

                console.log(`Make transaction and sign for address: ${addr}, count: ${balanceForTransfer}`);
                const transactionId = await msigContract.methods.submitTransaction({
                    dest: addr,
                    value: toNano(balanceForTransfer),
                    bounce: false,
                    allBalance: false,
                    payload: ''
                }).sendExternal({
                    //@ts-ignore
                    publicKey: signer1?.publicKey,
                });

                console.log(`Signer 2 confirmation...`);
                await msigContract.methods.confirmTransaction({
                    //@ts-ignore
                    transactionId: transactionId.output.transId,
                }).sendExternal({
                    //@ts-ignore
                    publicKey: signer2?.publicKey
                });

                console.log(`Signer 3 confirmation...`);
                await msigContract.methods.confirmTransaction({
                    //@ts-ignore
                    transactionId: transactionId.output.transId,
                }).sendExternal({
                    //@ts-ignore
                    publicKey: signer3?.publicKey
                });

                iI++;
            }

            await locklift.keystore.removeKeyPair(dataForSign[0].id.toString());
            await locklift.keystore.removeKeyPair(dataForSign[1].id.toString());
            await locklift.keystore.removeKeyPair(dataForSign[2].id.toString());
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch(e => {
        console.log(e);
        process.exit(1);
    });