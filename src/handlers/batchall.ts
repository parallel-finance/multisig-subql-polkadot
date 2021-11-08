import { SubstrateExtrinsic } from '@subql/types';
import { CrowdloanHandler } from './sub-handlers/crowdloan';

export class BatchAllHandler {
  private extrinsic: SubstrateExtrinsic;
  
  constructor(extrinsic: SubstrateExtrinsic) {
    this.extrinsic = extrinsic;
  }

  public async save() {
    await CrowdloanHandler.handleCrowdloan(this.extrinsic);
    await CrowdloanHandler.handleAuctionBot(this.extrinsic);
  }
}
