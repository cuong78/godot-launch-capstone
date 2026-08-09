package com.godotlaunch.backend.util;

import com.godotlaunch.backend.entity.Wallet;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WalletBalancePolicyTest {

    @Test
    void topUpCredit_IsRestrictedAndCannotBeWithdrawn() {
        Wallet wallet = wallet("0", "0");

        WalletBalancePolicy.creditRestricted(wallet, new BigDecimal("100"));

        assertThat(wallet.getBalance()).isEqualByComparingTo("100");
        assertThat(wallet.getWithdrawableBalance()).isEqualByComparingTo("0");
        assertThat(WalletBalancePolicy.restrictedBalance(wallet)).isEqualByComparingTo("100");
        assertThat(WalletBalancePolicy.availableForWithdrawal(wallet, BigDecimal.ZERO)).isZero();
    }

    @Test
    void topUpThenPurchase_LeavesOnlyRestrictedBalance() {
        Wallet wallet = wallet("0", "0");

        WalletBalancePolicy.creditRestricted(wallet, new BigDecimal("100"));
        WalletBalancePolicy.debitPurchaseRestrictedFirst(wallet, new BigDecimal("40"), BigDecimal.ZERO);

        assertThat(wallet.getBalance()).isEqualByComparingTo("60");
        assertThat(wallet.getWithdrawableBalance()).isZero();
        assertThat(WalletBalancePolicy.restrictedBalance(wallet)).isEqualByComparingTo("60");
    }

    @Test
    void topUpSalePurchaseAndWithdrawal_PreservePurchaseOnlyRemainder() {
        Wallet wallet = wallet("0", "0");

        WalletBalancePolicy.creditRestricted(wallet, new BigDecimal("100"));
        WalletBalancePolicy.creditSalesRevenue(wallet, new BigDecimal("200"));
        WalletBalancePolicy.debitPurchaseRestrictedFirst(wallet, new BigDecimal("50"), BigDecimal.ZERO);

        assertThat(wallet.getBalance()).isEqualByComparingTo("250");
        assertThat(wallet.getWithdrawableBalance()).isEqualByComparingTo("200");
        assertThat(WalletBalancePolicy.restrictedBalance(wallet)).isEqualByComparingTo("50");

        WalletBalancePolicy.debitCompletedWithdrawal(wallet, new BigDecimal("200"));

        assertThat(wallet.getBalance()).isEqualByComparingTo("50");
        assertThat(wallet.getWithdrawableBalance()).isZero();
        assertThat(WalletBalancePolicy.availableForWithdrawal(wallet, BigDecimal.ZERO)).isZero();
        assertThatThrownBy(() -> WalletBalancePolicy.debitCompletedWithdrawal(wallet, BigDecimal.ONE))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void topUpAfterWithdrawingAllRevenue_RemainsRestricted() {
        Wallet wallet = wallet("200", "200");

        WalletBalancePolicy.debitCompletedWithdrawal(wallet, new BigDecimal("200"));
        WalletBalancePolicy.creditRestricted(wallet, new BigDecimal("100"));

        assertThat(wallet.getBalance()).isEqualByComparingTo("100");
        assertThat(wallet.getWithdrawableBalance()).isZero();
        assertThat(WalletBalancePolicy.availableForWithdrawal(wallet, BigDecimal.ZERO)).isZero();
    }

    @Test
    void repeatedPurchaseSaleAndTopUp_CannotConvertTopUpIntoWithdrawableFunds() {
        Wallet wallet = wallet("0", "0");

        WalletBalancePolicy.creditRestricted(wallet, new BigDecimal("100"));
        WalletBalancePolicy.debitPurchaseRestrictedFirst(wallet, new BigDecimal("100"), BigDecimal.ZERO);
        WalletBalancePolicy.creditSalesRevenue(wallet, new BigDecimal("100"));
        WalletBalancePolicy.debitPurchaseRestrictedFirst(wallet, new BigDecimal("100"), BigDecimal.ZERO);
        WalletBalancePolicy.creditRestricted(wallet, new BigDecimal("100"));

        assertThat(wallet.getBalance()).isEqualByComparingTo("100");
        assertThat(wallet.getWithdrawableBalance()).isZero();
        assertThat(WalletBalancePolicy.restrictedBalance(wallet)).isEqualByComparingTo("100");
    }

    @Test
    void purchase_ConsumesRestrictedFundsBeforeSalesRevenue() {
        Wallet wallet = wallet("150", "50");

        WalletBalancePolicy.debitPurchaseRestrictedFirst(wallet, new BigDecimal("120"), BigDecimal.ZERO);

        assertThat(wallet.getBalance()).isEqualByComparingTo("30");
        assertThat(wallet.getWithdrawableBalance()).isEqualByComparingTo("30");
        assertThat(WalletBalancePolicy.restrictedBalance(wallet)).isZero();
    }

    @Test
    void pendingWithdrawal_ReservesRevenueFromPurchasesAndNewWithdrawals() {
        Wallet wallet = wallet("150", "100");
        BigDecimal pending = new BigDecimal("80");

        assertThat(WalletBalancePolicy.availableForWithdrawal(wallet, pending)).isEqualByComparingTo("20");
        assertThat(WalletBalancePolicy.spendableBalance(wallet, pending)).isEqualByComparingTo("70");
        assertThatThrownBy(() -> WalletBalancePolicy.debitPurchaseRestrictedFirst(wallet, new BigDecimal("71"), pending))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void purchaseCannotConsumeRevenueReservedByPendingPayout() {
        Wallet wallet = wallet("150", "100");
        BigDecimal pendingPayout = new BigDecimal("80");

        WalletBalancePolicy.debitPurchaseRestrictedFirst(wallet, new BigDecimal("70"), pendingPayout);

        assertThat(wallet.getBalance()).isEqualByComparingTo("80");
        assertThat(wallet.getWithdrawableBalance()).isEqualByComparingTo("80");
        assertThat(WalletBalancePolicy.availableForWithdrawal(wallet, pendingPayout)).isZero();
        WalletBalancePolicy.validateInvariant(wallet);
    }

    @Test
    void completedWithdrawal_DebitsBothTotalAndWithdrawableBalance() {
        Wallet wallet = wallet("180", "130");

        WalletBalancePolicy.debitCompletedWithdrawal(wallet, new BigDecimal("80"));

        assertThat(wallet.getBalance()).isEqualByComparingTo("100");
        assertThat(wallet.getWithdrawableBalance()).isEqualByComparingTo("50");
        assertThat(WalletBalancePolicy.restrictedBalance(wallet)).isEqualByComparingTo("50");
    }

    @Test
    void disputeRefund_DebitsRevenueFirst_WhileIncomingRefundStaysRestricted() {
        Wallet seller = wallet("100", "60");
        Wallet reporter = wallet("10", "0");

        WalletBalancePolicy.debitSellerRefund(seller, new BigDecimal("80"));
        WalletBalancePolicy.creditRestricted(reporter, new BigDecimal("80"));

        assertThat(seller.getBalance()).isEqualByComparingTo("20");
        assertThat(seller.getWithdrawableBalance()).isZero();
        assertThat(reporter.getBalance()).isEqualByComparingTo("90");
        assertThat(reporter.getWithdrawableBalance()).isZero();
    }

    private Wallet wallet(String balance, String withdrawableBalance) {
        Wallet wallet = new Wallet();
        wallet.setBalance(new BigDecimal(balance));
        wallet.setWithdrawableBalance(new BigDecimal(withdrawableBalance));
        return wallet;
    }
}
