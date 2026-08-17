-- V38 introduced the platform-advance accounting model where the platform
-- wallet may become negative while it fronts dispute refunds. It updated the
-- withdrawable-balance invariant, but the original V1 constraint still
-- rejected every negative balance before that new invariant could apply.
--
-- User wallets remain protected by WalletBalancePolicy: ordinary debit paths
-- reject amounts greater than the available balance. A negative balance is
-- produced only by debitPlatformAdvance() for the platform wallet.
ALTER TABLE public.wallets
    DROP CONSTRAINT IF EXISTS wallets_balance_check;
