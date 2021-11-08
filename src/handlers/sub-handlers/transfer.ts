import { SubstrateEvent } from '@subql/types';
import { TOKEN_DECIMAL } from '../../helpers';
import { Transfer } from '../../types/models/Transfer';
import { BlockHandler } from '../block';
import { AccountHandler } from './account';
import { TokenHandler } from './token';

enum FeePosition {
  'DepositRing',
  'Deposit',
}

export class TransferHandler {
  static async checkTransfer({ event, block: { events, timestamp, block } }: SubstrateEvent) {
    if (!events.find(item => item.event.section == 'multisig')) {
      return;
    }
    
    const transferInfos = events.filter(item => item.event.method === 'Transfer');
    let transfers: Promise<Transfer>[] = await transferInfos.map(async (transferInfo) => {
      const { data, section } = transferInfo.event;
      const [from, to, amount] = JSON.parse(data.toString());
      // logger.info(`Solve ${block.header.number}-${transferInfo.event}`);
      // logger.info(`Transfer: from: ${from}, to: ${to}, amount ${amount}`);
    
      await AccountHandler.ensureAccount(to);
      await AccountHandler.updateTransferStatistic(to);
      await AccountHandler.ensureAccount(from);
      await AccountHandler.updateTransferStatistic(from);
      await TokenHandler.ensureToken(section);
      await BlockHandler.ensureBlock(block.hash.toString());

      const transfer = new Transfer(event.hash.toString());

      transfer.toId = to;
      transfer.fromId = from;
      transfer.tokenId = section;
      transfer.amount = BigInt(amount);
      transfer.timestamp = timestamp;
      transfer.blockNumber = block.header.number.toBigInt();
      transfer.blockId = block.hash.toString();
      transfer.fee = events.reduce((total, cur) => {
        const method = cur.event.method;
        let fee = BigInt(0);

        if ([FeePosition[0], FeePosition[1]].includes(method)) {
          try {
            fee = BigInt(parseInt(JSON.parse(cur.event.data.toString())[FeePosition[cur.event.method]]));
          } catch (err) { }

          return total + BigInt(fee);
        }

        return total;
      }, BigInt(0));

      const mutisigs = events.filter(item => item.event.section === 'multisig');
      const existMultisig = mutisigs.filter(item => {
        const { data } = item.event;
        const [multisig] = JSON.parse(data.toString());
        multisig === transfer.fromId
      });
      if (!existMultisig) {
        return null;
      }

      return transfer;
    });

    if (!transfers.length) {
      logger.info(`No multisig transfer event in this block`)
    }

    try{
      await Promise.all(
        transfers.map(async transfer => TransferHandler.saveTransfer(await transfer))
      );
    } catch (error) {
      logger.error(error.message);
    }
  }
  
  static async saveTransfer(transfer: Transfer) {
    let existTransfers = await Transfer.getByBlockId(transfer.blockId);
    if (existTransfers != undefined) {
      if (existTransfers.filter(t => t.id !== transfer.id && t.fromId === transfer.fromId && t.toId === transfer.toId).length) {
        return;
      } else {
        // logger.info(`not empty and also not exist`)
      }
    }

    try {
      // logger.info(`Save transfer: ${transfer.fromId} to ${transfer.toId}`);
      await transfer.save();
    } catch (error) {
      logger.error(error.message);
    }
  }
}
