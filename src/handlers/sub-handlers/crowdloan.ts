import { SubstrateExtrinsic } from '@subql/types';
import { Crowdloan } from '../../types/models/Crowdloan';
import type { Extrinsic as IExtrinsic } from "@polkadot/types/interfaces";
import type { Vec, Result, Null, Option } from "@polkadot/types";

const MULTISIG_ADDR = "13wNbioJt44NKrcQ5ZUrshJqP7TKzQbzZt5nhkeL4joa3PAX";
const PROXY_ADDR = "13vj58X9YtGCRBFHrcxP6GCkBu81ALcqexiwySx18ygqAUw";

const parseRemark = (remark: { toString: () => string }) => {
    logger.info(`Remark is ${remark.toString()}`);
    return Buffer.from(remark.toString().slice(2), "hex").toString("utf8");
};

const checkTransaction = (sectionFilter: string, methodFilter: string, call: IExtrinsic) => {
    const { section, method } = api.registry.findMetaCall(call.callIndex);
    return section === sectionFilter && method === methodFilter;
};

const checkTransactionInsideProxy = (sectionFilter: string, methodFilter: string, call: IExtrinsic) => {
    if (!checkTransaction("proxy", "proxy", call)) return false;
    const addr = call.args[0].toString();
    if (addr !== MULTISIG_ADDR) {
        logger.debug("Found proxy address: " + addr + ", expected: " + MULTISIG_ADDR);
        return false;
    }
    const insideCall = call.args[2] as IExtrinsic;
    return checkTransaction(sectionFilter, methodFilter, insideCall);
};

export class CrowdloanHandler {
    static async handleCrowdloan(extrinsic: SubstrateExtrinsic) {
        const calls = extrinsic.extrinsic.args[0] as Vec<IExtrinsic>;
        if (
            calls.length !== 2 ||
            !checkTransaction("system", "remark", calls[0]) ||
            !checkTransaction("balances", "transfer", calls[1])
        ) {
            return;
        }
        const [
            {
                args: [remarkRaw],
            },
            {
                args: [addressRaw, amountRaw],
            },
        ] = calls.toArray();

        if (addressRaw.toString() !== MULTISIG_ADDR) {
            return;
        }

        const [paraId, referralCode] = parseRemark(remarkRaw).split("#");

        const crowdloanRecord = Crowdloan.create({
            id: extrinsic.extrinsic.hash.toString(),

            blockHeight: extrinsic.block.block.header.number.toNumber(),
            paraId: parseInt(paraId),
            account: extrinsic.extrinsic.signer.toString(),
            amount: amountRaw.toString(),
            referralCode,
            timestamp: extrinsic.block.timestamp,
            transactionExecuted: false,
            isValid: true,
            executedBlockHeight: null,
        });
        logger.info(JSON.stringify(crowdloanRecord));

        try {
            await crowdloanRecord.save();
        } catch (error) {
            logger.error(error.message);
        }
    };

    static async handleAuctionBot(extrinsic: SubstrateExtrinsic) {
        // batchAll[
        //  remark(previous_hash)
        //  proxy(contribute(amount))
        //  proxy(addMemo(referralCode))
        // ]
        if (extrinsic.extrinsic.signer.toString() !== PROXY_ADDR) {
            return;
        }

        const [remarkCall, proxyContributeCall] = (extrinsic.extrinsic.args[0] as Vec<IExtrinsic>).toArray();

        // Check format
        if (
            !checkTransaction("system", "remark", remarkCall) ||
            !checkTransactionInsideProxy("crowdloan", "contribute", proxyContributeCall)
        ) {
            return;
        }

        let remark = remarkCall.args[0].toString();
        remark = remark.length !== 66 ? parseRemark(remark) : remark;

        const txIds = remark.split("#");
        txIds.forEach((txId) => logger.info(`Fetch execution of ${txId}`));
        const entities = await Promise.all(txIds.map((txId) => Crowdloan.get(txId)));

        const {
            event: {
                data: [result],
            },
        } = extrinsic.events.find((e) => e.event.section === "proxy" && e.event.method === "ProxyExecuted");

        const status = (result as Result<Null, any>).isOk;

        entities.forEach((entity) => (entity.isValid = status));
        await Promise.all(
            entities.map((entity) => {
                entity.transactionExecuted = true;
                entity.executedBlockHeight = extrinsic.block.block.header.number.toNumber();
                return entity.save();
            })
        );
    };
};