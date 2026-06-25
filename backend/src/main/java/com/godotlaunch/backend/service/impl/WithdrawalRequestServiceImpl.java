package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.CreateWithdrawalRequest;
import com.godotlaunch.backend.dto.request.ReviewWithdrawalRequest;
import com.godotlaunch.backend.dto.response.WithdrawalRequestResponse;
import com.godotlaunch.backend.entity.Transaction;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.Wallet;
import com.godotlaunch.backend.entity.WithdrawalRequest;
import com.godotlaunch.backend.entity.enums.TxnStatus;
import com.godotlaunch.backend.entity.enums.TxnType;
import com.godotlaunch.backend.entity.enums.WithdrawalStatus;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.TransactionRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.repository.WalletRepository;
import com.godotlaunch.backend.repository.WithdrawalRequestRepository;
import com.godotlaunch.backend.service.WalletService;
import com.godotlaunch.backend.service.WithdrawalRequestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WithdrawalRequestServiceImpl implements WithdrawalRequestService {

    private final WithdrawalRequestRepository withdrawalRequestRepository;
    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final WalletService walletService;

    @Override
    @Transactional
    public WithdrawalRequestResponse createWithdrawalRequest(CreateWithdrawalRequest request, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // Use pessimistic write lock to prevent concurrent withdrawal race conditions
        Wallet wallet = walletRepository.findByUserIdWithLock(user.getId())
                .orElseGet(() -> {
                    Wallet newWallet = new Wallet();
                    newWallet.setUser(user);
                    newWallet.setBalance(BigDecimal.ZERO);
                    newWallet.setCurrency("VND");
                    walletRepository.saveAndFlush(newWallet);
                    return walletRepository.findByUserIdWithLock(user.getId())
                            .orElseThrow(() -> new AppException(ErrorCode.WALLET_NOT_FOUND));
                });

        if (wallet.getBalance().compareTo(request.getAmount()) < 0) {
            throw new AppException(ErrorCode.INSUFFICIENT_BALANCE);
        }

        // Deduct balance immediately to prevent double spending
        wallet.setBalance(wallet.getBalance().subtract(request.getAmount()));
        walletRepository.save(wallet);

        // Create a pending transaction for this withdrawal
        Transaction txn = new Transaction();
        txn.setWallet(wallet);
        txn.setRelatedUser(null);
        txn.setGame(null);
        txn.setAmount(request.getAmount());
        txn.setPlatformCommission(BigDecimal.ZERO);
        txn.setNetAmount(request.getAmount());
        txn.setType(TxnType.withdrawal);
        txn.setStatus(TxnStatus.pending);
        txn.setReferenceId("Rút tiền về " + request.getBankName());
        transactionRepository.save(txn);

        // Create withdrawal request
        WithdrawalRequest wr = new WithdrawalRequest();
        wr.setUser(user);
        wr.setWallet(wallet);
        wr.setAmount(request.getAmount());
        wr.setCurrency(wallet.getCurrency());
        wr.setBankName(request.getBankName());
        wr.setBankAccount(request.getBankAccount()); // Application layer can encrypt this if required later
        wr.setAccountHolder(request.getAccountHolder());
        wr.setStatus(WithdrawalStatus.pending);
        wr.setTransaction(txn);

        WithdrawalRequest saved = withdrawalRequestRepository.save(wr);
        log.info("Created withdrawal request {} for user {} with amount={}", saved.getId(), user.getId(), request.getAmount());

        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public WithdrawalRequestResponse getWithdrawalRequest(UUID id, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        WithdrawalRequest wr = withdrawalRequestRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.WITHDRAWAL_REQUEST_NOT_FOUND));

        boolean isAdmin = "admin".equalsIgnoreCase(user.getRole().getName());
        boolean isOwner = wr.getUser().getId().equals(user.getId());

        if (!isAdmin && !isOwner) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        return mapToResponse(wr);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WithdrawalRequestResponse> getMyWithdrawalRequests(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return withdrawalRequestRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<WithdrawalRequestResponse> getAllWithdrawalRequests() {
        return withdrawalRequestRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public WithdrawalRequestResponse reviewWithdrawalRequest(UUID requestId, ReviewWithdrawalRequest request, String adminEmail) {
        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        WithdrawalRequest wr = withdrawalRequestRepository.findById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.WITHDRAWAL_REQUEST_NOT_FOUND));

        if (wr.getStatus() != WithdrawalStatus.pending) {
            throw new AppException(ErrorCode.INVALID_WITHDRAWAL_STATUS);
        }

        Transaction txn = wr.getTransaction();

        if (request.isApprove()) {
            wr.setStatus(WithdrawalStatus.completed); // Mark as completed
            if (txn != null) {
                txn.setStatus(TxnStatus.completed);
                transactionRepository.save(txn);
            }
            log.info("Withdrawal request {} approved by admin {}", requestId, adminEmail);
        } else {
            wr.setStatus(WithdrawalStatus.rejected);
            wr.setRejectReason(request.getRejectReason());

            if (txn != null) {
                txn.setStatus(TxnStatus.failed);
                transactionRepository.save(txn);
            }

            // Refund balance to developer's wallet
            Wallet wallet = wr.getWallet();
            wallet.setBalance(wallet.getBalance().add(wr.getAmount()));
            walletRepository.save(wallet);
            log.info("Withdrawal request {} rejected by admin {} with reason: {}. Balance refunded.", requestId, adminEmail, request.getRejectReason());
        }

        wr.setReviewedBy(admin);
        wr.setReviewedAt(Instant.now());

        WithdrawalRequest updated = withdrawalRequestRepository.save(wr);
        return mapToResponse(updated);
    }

    private WithdrawalRequestResponse mapToResponse(WithdrawalRequest wr) {
        return WithdrawalRequestResponse.builder()
                .id(wr.getId())
                .userId(wr.getUser().getId())
                .userEmail(wr.getUser().getEmail())
                .userFullName(wr.getUser().getFullName())
                .walletId(wr.getWallet().getId())
                .amount(wr.getAmount())
                .currency(wr.getCurrency())
                .bankName(wr.getBankName())
                .bankAccount(wr.getBankAccount())
                .accountHolder(wr.getAccountHolder())
                .status(wr.getStatus())
                .reviewedById(wr.getReviewedBy() != null ? wr.getReviewedBy().getId() : null)
                .reviewedByFullName(wr.getReviewedBy() != null ? wr.getReviewedBy().getFullName() : null)
                .reviewedAt(wr.getReviewedAt())
                .rejectReason(wr.getRejectReason())
                .transactionId(wr.getTransaction() != null ? wr.getTransaction().getId() : null)
                .createdAt(wr.getCreatedAt())
                .updatedAt(wr.getUpdatedAt())
                .build();
    }
}
