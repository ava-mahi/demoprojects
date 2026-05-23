import { prisma } from '../../lib/prisma';
import { Prisma, TradeStatus, ForceOutcome, BinaryDirection, TxType } from '@prisma/client';
import type { MarketEngine } from '../market/engine';

export class TradeResolver {
  private timer?: NodeJS.Timeout;
  private notifier?: (userId: string, payload: any) => void;
  private balanceEmitter?: (userId: string, accountId: string, balance: string) => void;

  constructor(private engine: MarketEngine) {}

  setNotifier(fn: (userId: string, payload: any) => void) {
    this.notifier = fn;
  }
  setBalanceEmitter(fn: (userId: string, accountId: string, balance: string) => void) {
    this.balanceEmitter = fn;
  }

  start() {
    this.timer = setInterval(() => this.tick().catch((e) => console.error('[resolver]', e)), 500);
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Decide outcome for a binary trade considering forced overrides + control. */
  private async pickOutcome(userId: string, naturalWin: boolean): Promise<{ win: boolean; forced: ForceOutcome }> {
    const ctrl = await prisma.userTradingControl.findUnique({ where: { userId } });
    if (!ctrl || !ctrl.enabled) return { win: naturalWin, forced: ForceOutcome.NONE };
    if (ctrl.forceCount > 0 && ctrl.forceNext !== ForceOutcome.NONE) {
      const win = ctrl.forceNext === ForceOutcome.WIN;
      await prisma.userTradingControl.update({
        where: { userId },
        data: { forceCount: { decrement: 1 }, forceNext: ctrl.forceCount - 1 <= 0 ? ForceOutcome.NONE : ctrl.forceNext },
      });
      return { win, forced: ctrl.forceNext };
    }
    // probability override
    const winChance = Math.max(0, Math.min(100, ctrl.winRatePct)) / 100;
    const win = Math.random() < winChance;
    return { win, forced: ForceOutcome.NONE };
  }

  async tick() {
    const now = new Date();
    const due = await prisma.trade.findMany({
      where: { status: TradeStatus.OPEN, kind: 'BINARY', expiresAt: { lte: now } },
      take: 50,
    });
    for (const trade of due) {
      await this.resolveBinary(trade.id).catch((e) => console.error('[resolveBinary]', trade.id, e));
    }
  }

  async resolveBinary(tradeId: string) {
    const trade = await prisma.trade.findUnique({ where: { id: tradeId }, include: { asset: true } });
    if (!trade || trade.status !== 'OPEN' || trade.kind !== 'BINARY') return;
    const closePrice = this.engine.current(trade.asset.symbol) ?? trade.openPrice;

    let naturalWin = false;
    if (trade.direction === BinaryDirection.UP) naturalWin = closePrice > trade.openPrice;
    else naturalWin = closePrice < trade.openPrice;
    // tie -> refund
    const isTie = closePrice === trade.openPrice;

    const { win, forced } = isTie ? { win: false, forced: ForceOutcome.NONE } : await this.pickOutcome(trade.userId, naturalWin);

    // If forced, adjust the displayed closePrice slightly so user sees consistent outcome
    let displayedClose = closePrice;
    if (!isTie && win !== naturalWin) {
      const eps = Math.max(Math.abs(trade.openPrice) * 0.0001, 0.0001);
      if (trade.direction === BinaryDirection.UP) {
        displayedClose = win ? trade.openPrice + eps : trade.openPrice - eps;
      } else {
        displayedClose = win ? trade.openPrice - eps : trade.openPrice + eps;
      }
    }

    const stake = new Prisma.Decimal(trade.stake);
    let payout = new Prisma.Decimal(0);
    let status: TradeStatus = TradeStatus.LOST;
    if (isTie) {
      payout = stake; // refund
      status = TradeStatus.TIE;
    } else if (win) {
      payout = stake.mul(1 + trade.payoutPct / 100);
      status = TradeStatus.WON;
    } else {
      payout = new Prisma.Decimal(0);
      status = TradeStatus.LOST;
    }

    await prisma.$transaction(async (tx) => {
      await tx.trade.update({
        where: { id: trade.id },
        data: { status, closePrice: displayedClose, payout, resolvedAt: new Date(), forced },
      });
      if (payout.gt(0)) {
        const acct = await tx.account.update({
          where: { id: trade.accountId },
          data: { balance: { increment: payout } },
        });
        await tx.transaction.create({
          data: {
            userId: trade.userId,
            accountId: trade.accountId,
            type: TxType.TRADE_PAYOUT,
            amount: payout,
            currency: acct.currency,
            ref: trade.id,
          },
        });
        this.balanceEmitter?.(trade.userId, acct.id, acct.balance.toString());
      }
      await tx.notification.create({
        data: {
          userId: trade.userId,
          kind: 'TRADE',
          title: status === 'WON' ? `Won ${payout.minus(stake).toFixed(2)}` : status === 'TIE' ? 'Refunded (tie)' : `Lost ${stake.toFixed(2)}`,
          body: `${trade.asset.symbol} ${trade.direction}`,
        },
      });
    });

    this.notifier?.(trade.userId, {
      type: 'trade:result',
      tradeId: trade.id,
      status,
      payout: payout.toString(),
      closePrice: displayedClose,
    });
  }
}
