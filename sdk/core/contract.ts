// TODO Implementation wrapper of the contract

class Contract {
    contractAddress: string;

    constructor() {
        this.contractAddress = "";
    }

    verifyVDF(id: string): boolean {
        return true;
    }


    verifyZkp(proof: any): boolean {
        return true;
    }

    sendTransaction(data: any): string {
        return "tx_hash";
    }
}