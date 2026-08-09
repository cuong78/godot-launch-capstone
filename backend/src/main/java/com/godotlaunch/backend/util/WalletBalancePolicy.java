package com.godotlaunch.backend.util;

import com.godotlaunch.backend.entity.Wallet;

import java.math.BigDecimal;
import java.util.Objects;

/**
 * Central source-allocation policy for wallet mutations.
 * Restricted funds are consumed before sale revenue when buying products.
 */
public final class WalletBalancePolicy {

    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private WalletBalancePolicy() {
    }

    public static BigDecimal balance(Wallet wallet) {
        requireWallet(wallet);
        return safe(wallet.getBalance());
    }

    public static BigDecimal withdrawableBalance(Wallet wallet) {
        requireWallet(wallet);
        return safe(wallet.getWithdrawableBalance());
    }

    public static BigDecimal restrictedBalance(Wallet wallet) {
        return balance(wallet).subtract(withdrawableBalance(wallet)).max(ZERO);
    }

    public static BigDecimal availableForWithdrawal(Wallet wallet, BigDecimal pendingWithdrawal) {
        BigDecimal revenueCapacity = withdrawableBalance(wallet).min(balance(wallet));
        return revenueCapacity.subtract(reservedWithdrawalAmount(pendingWithdrawal)).max(ZERO);
    }

    public static BigDecimal spendableBalance(Wallet wallet, BigDecimal pendingWithdrawal) {
        BigDecimal unreservedRevenue = withdrawableBalance(wallet)
                .subtract(reservedWithdrawalAmount(pendingWithdrawal))
                .max(ZERO);
        return restrictedBalance(wallet).add(unreservedRevenue);
    }

    public static void creditRestricted(Wallet wallet, BigDecimal amount) {
        requirePositiveOrZero(amount);
        validateInvariant(wallet);
        wallet.setBalance(balance(wallet).add(amount));
        validateInvariant(wallet);
    }

    public static void creditSalesRevenue(Wallet wallet, BigDecimal amount) {
        requirePositiveOrZero(amount);
        validateInvariant(wallet);
        wallet.setBalance(balance(wallet).add(amount));
        wallet.setWithdrawableBalance(withdrawableBalance(wallet).add(amount));
        validateInvariant(wallet);
    }

    public static void debitPurchaseRestrictedFirst(
            Wallet wallet,
            BigDecimal amount,
            BigDecimal pendingWithdrawal
    ) {
        requirePositiveOrZero(amount);
        validateInvariant(wallet);
        if (amount.compareTo(spendableBalance(wallet, pendingWithdrawal)) > 0) {
            throw new IllegalStateException("Purchase exceeds unreserved wallet funds");
        }

        BigDecimal fromRestricted = amount.min(restrictedBalance(wallet));
        BigDecimal fromWithdrawable = amount.subtract(fromRestricted);
        wallet.setBalance(balance(wallet).subtract(amount));
        wallet.setWithdrawableBalance(withdrawableBalance(wallet).subtract(fromWithdrawable));
        validateInvariant(wallet);
    }

    public static void debitCompletedWithdrawal(Wallet wallet, BigDecimal amount) {
        requirePositiveOrZero(amount);
        validateInvariant(wallet);
        if (amount.compareTo(balance(wallet)) > 0
                || amount.compareTo(withdrawableBalance(wallet)) > 0) {
            throw new IllegalStateException("Withdrawal exceeds withdrawable wallet funds");
        }

        wallet.setBalance(balance(wallet).subtract(amount));
        wallet.setWithdrawableBalance(withdrawableBalance(wallet).subtract(amount));
        validateInvariant(wallet);
    }

    public static void debitSellerRefund(Wallet wallet, BigDecimal amount) {
        requirePositiveOrZero(amount);
        validateInvariant(wallet);
        if (amount.compareTo(balance(wallet)) > 0) {
            throw new IllegalStateException("Refund exceeds wallet balance");
        }

        BigDecimal fromWithdrawable = amount.min(withdrawableBalance(wallet));
        wallet.setBalance(balance(wallet).subtract(amount));
        wallet.setWithdrawableBalance(withdrawableBalance(wallet).subtract(fromWithdrawable));
        validateInvariant(wallet);
    }

    public static void validateInvariant(Wallet wallet) {
        requireWallet(wallet);
        BigDecimal currentBalance = balance(wallet);
        BigDecimal currentWithdrawable = withdrawableBalance(wallet);
        wallet.setBalance(currentBalance);
        wallet.setWithdrawableBalance(currentWithdrawable);

        if (currentBalance.compareTo(ZERO) < 0
                || currentWithdrawable.compareTo(ZERO) < 0
                || currentWithdrawable.compareTo(currentBalance) > 0) {
            throw new IllegalStateException("Wallet balance source invariant violated");
        }
    }

    private static BigDecimal safe(BigDecimal value) {
        return value == null ? ZERO : value;
    }

    private static BigDecimal reservedWithdrawalAmount(BigDecimal pendingWithdrawal) {
        return safe(pendingWithdrawal).max(ZERO);
    }

    private static void requireWallet(Wallet wallet) {
        Objects.requireNonNull(wallet, "Wallet is required");
    }

    private static void requirePositiveOrZero(BigDecimal amount) {
        if (amount == null || amount.compareTo(ZERO) < 0) {
            throw new IllegalArgumentException("Amount must be non-negative");
        }
    }
}
