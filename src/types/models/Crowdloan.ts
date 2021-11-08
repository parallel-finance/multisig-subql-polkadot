// Auto-generated , DO NOT EDIT
import {Entity} from "@subql/types";
import assert from 'assert';


export class Crowdloan implements Entity {

    constructor(id: string) {
        this.id = id;
    }


    public id: string;

    public blockHeight: number;

    public paraId: number;

    public account: string;

    public amount: string;

    public referralCode?: string;

    public timestamp: Date;

    public transactionExecuted: boolean;

    public isValid: boolean;

    public executedBlockHeight?: number;


    async save(): Promise<void>{
        let id = this.id;
        assert(id !== null, "Cannot save Crowdloan entity without an ID");
        await store.set('Crowdloan', id.toString(), this);
    }
    static async remove(id:string): Promise<void>{
        assert(id !== null, "Cannot remove Crowdloan entity without an ID");
        await store.remove('Crowdloan', id.toString());
    }

    static async get(id:string): Promise<Crowdloan | undefined>{
        assert((id !== null && id !== undefined), "Cannot get Crowdloan entity without an ID");
        const record = await store.get('Crowdloan', id.toString());
        if (record){
            return Crowdloan.create(record);
        }else{
            return;
        }
    }


    static async getByBlockHeight(blockHeight: number): Promise<Crowdloan[] | undefined>{
      
      const records = await store.getByField('Crowdloan', 'blockHeight', blockHeight);
      return records.map(record => Crowdloan.create(record));
      
    }

    static async getByParaId(paraId: number): Promise<Crowdloan[] | undefined>{
      
      const records = await store.getByField('Crowdloan', 'paraId', paraId);
      return records.map(record => Crowdloan.create(record));
      
    }

    static async getByExecutedBlockHeight(executedBlockHeight: number): Promise<Crowdloan[] | undefined>{
      
      const records = await store.getByField('Crowdloan', 'executedBlockHeight', executedBlockHeight);
      return records.map(record => Crowdloan.create(record));
      
    }


    static create(record){
        let entity = new Crowdloan(record.id);
        Object.assign(entity,record);
        return entity;
    }
}
