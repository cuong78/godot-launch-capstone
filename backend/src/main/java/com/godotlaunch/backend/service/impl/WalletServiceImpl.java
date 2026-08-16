package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.projection.TransactionWithBalanceRow;
import com.godotlaunch.backend.dto.response.TransactionResponse;
import com.godotlaunch.backend.dto.response.WalletResponse;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.Transaction;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.Wallet;
import com.godotlaunch.backend.entity.enums.TxnType;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.TransactionRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.repository.WalletRepository;
import com.godotlaunch.backend.service.WalletService;
import com.godotlaunch.backend.util.WalletBalancePolicy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WalletServiceImpl implements WalletService {

    private static final String DEFAULT_CURRENCY = "VND";
    private static final String PLATFORM_ADMIN_EMAIL = "admin@godotlaunch.com";

    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final GameRepository gameRepository;

    @Value("${DEMO_MODE:false}")
    private boolean demoMode;

    @Override
    @Transactional
    public Wallet getOrCreateWallet(User user) {
        Wallet wallet = walletRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    // There is no wallet row to lock yet. Lock the owning user so
                    // concurrent first-use requests cannot both insert a wallet.
                    User lockedUser = userRepository.findByIdWithLock(user.getId())
                            .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

                    Wallet concurrentlyCreated = walletRepository.findByUserId(lockedUser.getId()).orElse(null);
                    if (concurrentlyCreated != null) {
                        return concurrentlyCreated;
                    }

                    Wallet newWallet = new Wallet();
                    newWallet.setUser(lockedUser);
                    newWallet.setBalance(BigDecimal.ZERO);
                    newWallet.setWithdrawableBalance(BigDecimal.ZERO);
                    newWallet.setCurrency(DEFAULT_CURRENCY);
                    return walletRepository.save(newWallet);
                });

        if (!DEFAULT_CURRENCY.equalsIgnoreCase(wallet.getCurrency())) {
            wallet.setCurrency(DEFAULT_CURRENCY);
            wallet = walletRepository.save(wallet);
        }

        return wallet;
    }

    @Override
    @Transactional
    public WalletResponse getWalletResponse(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        Wallet wallet = getOrCreateWallet(user);
        return mapToWalletResponse(wallet);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<TransactionResponse> getTransactionHistory(String email, Pageable pageable) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return transactionRepository.findByWalletUserIdWithBalanceOrderByCreatedAtDesc(user.getId(), pageable)
                .map(this::mapToTransactionResponse);
    }

    /**
     * Cộng doanh thu cho người bán (seller) khi có giao dịch mua game/asset.
     *
     * @param sellerId           ID của người bán nhận doanh thu
     * @param buyerId            ID của người mua thực hiện giao dịch (optional)
     * @param amount             Tổng giá bán của sản phẩm (Total price paid by buyer)
     * @param platformCommission Số tiền hoa hồng platform giữ lại (Platform commission fee)
     * @param gameId             ID của game liên quan (optional)
     * @param referenceId        Mã tham chiếu giao dịch ngoài (ví dụ: mã của PayOS)
     *
     * Note: netAmount = amount - platformCommission. Số tiền này sẽ được cộng trực tiếp vào ví của seller.
     */
    @Override
    @Transactional
    public void addRevenue(UUID sellerId, UUID buyerId, BigDecimal amount, BigDecimal platformCommission, UUID gameId, String referenceId) {
        validateRevenueAmounts(amount, platformCommission);

        User seller = userRepository.findById(sellerId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        User buyer = buyerId != null ? userRepository.findById(buyerId).orElse(null) : null;
        Game game = gameId != null ? gameRepository.findById(gameId).orElse(null) : null;

        Wallet wallet = walletRepository.findByUserIdWithLock(seller.getId())
                .orElseGet(() -> {
                    getOrCreateWallet(seller);
                    return walletRepository.findByUserIdWithLock(seller.getId())
                            .orElseThrow(() -> new AppException(ErrorCode.WALLET_NOT_FOUND));
                });
        if (!DEFAULT_CURRENCY.equalsIgnoreCase(wallet.getCurrency())) {
            wallet.setCurrency(DEFAULT_CURRENCY);
        }
        BigDecimal netAmount = amount.subtract(platformCommission);

        // The wallet lock serializes retries for the same seller. A stable
        // external reference therefore makes revenue credit idempotent.
        if (StringUtils.hasText(referenceId)
                && transactionRepository.existsByWalletIdAndTypeAndReferenceId(
                        wallet.getId(),
                        TxnType.revenue_share,
                        referenceId.trim()
                )) {
            log.info("Skipping duplicate revenue credit for seller {} and reference {}", sellerId, referenceId);
            return;
        }

        WalletBalancePolicy.creditSalesRevenue(wallet, netAmount);
        walletRepository.save(wallet);

        Transaction txn = new Transaction();
        txn.setWallet(wallet);
        txn.setRelatedUser(buyer);
        txn.setGame(game);
        txn.setAmount(netAmount);
        txn.setType(TxnType.revenue_share);
        txn.setReferenceId(StringUtils.hasText(referenceId) ? referenceId.trim() : referenceId);
        txn.setDescription("Credit seller wallet with net sales revenue");

        transactionRepository.save(txn);
        log.info("Successfully added revenue share to seller {}'s wallet: amount={}, commission={}, netAmount={}",
                sellerId, amount, platformCommission, netAmount);
    }

    @Override
    @Transactional
    public WalletResponse demoTopupPlatformWallet(BigDecimal amount) {
        if (!demoMode) {
            throw new AppException(ErrorCode.DEMO_MODE_DISABLED);
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be positive");
        }

        User platformAdmin = userRepository.findByEmail(PLATFORM_ADMIN_EMAIL)
                .orElseGet(() -> userRepository.findAdminsOrderByCreatedAtAsc(PageRequest.of(0, 1)).stream()
                        .findFirst()
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND)));

        Wallet wallet = walletRepository.findByUserIdWithLock(platformAdmin.getId())
                .orElseGet(() -> {
                    getOrCreateWallet(platformAdmin);
                    return walletRepository.findByUserIdWithLock(platformAdmin.getId())
                            .orElseThrow(() -> new AppException(ErrorCode.WALLET_NOT_FOUND));
                });

        WalletBalancePolicy.creditSalesRevenue(wallet, amount);
        walletRepository.save(wallet);

        Transaction txn = new Transaction();
        txn.setWallet(wallet);
        txn.setAmount(amount);
        txn.setType(TxnType.wallet_topup);
        txn.setReferenceId("DEMO_TOPUP:" + Instant.now().toEpochMilli());
        txn.setDescription("Demo top-up ví platform (DEMO_MODE) — không phải tiền thật.");
        transactionRepository.save(txn);

        log.info("Demo top-up platform wallet: amount={}", amount);
        return mapToWalletResponse(wallet);
    }

    private void validateRevenueAmounts(BigDecimal amount, BigDecimal platformCommission) {
        if (amount == null || platformCommission == null) {
            throw new IllegalArgumentException("Sale amount and commission are required");
        }
        if (amount.compareTo(BigDecimal.ZERO) < 0 || platformCommission.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Sale amount and commission must be non-negative");
        }
        if (platformCommission.compareTo(amount) > 0) {
            throw new IllegalArgumentException("Net amount cannot be negative");
        }
    }

    private WalletResponse mapToWalletResponse(Wallet wallet) {
        return WalletResponse.builder()
                .id(wallet.getId())
                .userId(wallet.getUser().getId())
                .balance(wallet.getBalance())
                .currency(wallet.getCurrency())
                .updatedAt(wallet.getUpdatedAt())
                .build();
    }

    private TransactionResponse mapToTransactionResponse(TransactionWithBalanceRow row) {
        return TransactionResponse.builder()
                .id(row.getId())
                .walletId(row.getWalletId())
                .relatedUserId(row.getRelatedUserId())
                .relatedUserFullName(row.getRelatedUserFullName())
                .gameId(row.getGameId())
                .gameTitle(row.getGameTitle())
                .amount(row.getAmount())
                .type(TxnType.valueOf(row.getType()))
                .referenceId(row.getReferenceId())
                .createdAt(row.getCreatedAt())
                .balanceAfter(row.getBalanceAfter())
                .build();
    }
}
