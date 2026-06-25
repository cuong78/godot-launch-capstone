package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.response.TransactionResponse;
import com.godotlaunch.backend.dto.response.WalletResponse;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.Transaction;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.Wallet;
import com.godotlaunch.backend.entity.enums.TxnStatus;
import com.godotlaunch.backend.entity.enums.TxnType;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.TransactionRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.repository.WalletRepository;
import com.godotlaunch.backend.service.WalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final GameRepository gameRepository;

    @Override
    @Transactional
    public Wallet getOrCreateWallet(User user) {
        return walletRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    Wallet wallet = new Wallet();
                    wallet.setUser(user);
                    wallet.setBalance(BigDecimal.ZERO);
                    wallet.setCurrency("VND");
                    return walletRepository.save(wallet);
                });
    }

    @Override
    @Transactional(readOnly = true)
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
        return transactionRepository.findByWalletUserIdOrderByCreatedAtDesc(user.getId(), pageable)
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
        User seller = userRepository.findById(sellerId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        User buyer = buyerId != null ? userRepository.findById(buyerId).orElse(null) : null;
        Game game = gameId != null ? gameRepository.findById(gameId).orElse(null) : null;

        Wallet wallet = getOrCreateWallet(seller);
        BigDecimal netAmount = amount.subtract(platformCommission);
        if (netAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Net amount cannot be negative");
        }

        wallet.setBalance(wallet.getBalance().add(netAmount));
        walletRepository.save(wallet);

        Transaction txn = new Transaction();
        txn.setWallet(wallet);
        txn.setRelatedUser(buyer);
        txn.setGame(game);
        txn.setAmount(amount);
        txn.setPlatformCommission(platformCommission);
        txn.setNetAmount(netAmount);
        txn.setType(TxnType.revenue_share);
        txn.setStatus(TxnStatus.completed);
        txn.setReferenceId(referenceId);

        transactionRepository.save(txn);
        log.info("Successfully added revenue share to seller {}'s wallet: amount={}, commission={}, netAmount={}",
                sellerId, amount, platformCommission, netAmount);
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

    private TransactionResponse mapToTransactionResponse(Transaction txn) {
        return TransactionResponse.builder()
                .id(txn.getId())
                .walletId(txn.getWallet().getId())
                .relatedUserId(txn.getRelatedUser() != null ? txn.getRelatedUser().getId() : null)
                .relatedUserFullName(txn.getRelatedUser() != null ? txn.getRelatedUser().getFullName() : null)
                .gameId(txn.getGame() != null ? txn.getGame().getId() : null)
                .gameTitle(txn.getGame() != null ? txn.getGame().getTitle() : null)
                .amount(txn.getAmount())
                .platformCommission(txn.getPlatformCommission())
                .netAmount(txn.getNetAmount())
                .type(txn.getType())
                .status(txn.getStatus())
                .referenceId(txn.getReferenceId())
                .createdAt(txn.getCreatedAt())
                .build();
    }
}
