package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.response.PayoutGatewayStatusResponse;
import com.godotlaunch.backend.entity.Transaction;
import com.godotlaunch.backend.entity.Wallet;
import com.godotlaunch.backend.entity.WithdrawalRequest;
import com.godotlaunch.backend.entity.enums.AuditAction;
import com.godotlaunch.backend.entity.enums.AuditTarget;
import com.godotlaunch.backend.entity.enums.TxnType;
import com.godotlaunch.backend.entity.enums.WithdrawalStatus;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.TransactionRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.repository.WalletRepository;
import com.godotlaunch.backend.repository.WithdrawalRequestRepository;
import com.godotlaunch.backend.repository.PayoutGateway;
import com.godotlaunch.backend.service.AuditLogService;
import com.godotlaunch.backend.service.WithdrawalStatusSynchronizer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class WithdrawalStatusSynchronizerImpl implements WithdrawalStatusSynchronizer {

    private static final String DEFAULT_CURRENCY = "VND";
    private static final String WITHDRAWAL_TXN_DESCRIPTION = "Withdrawal via PayOS";
    private static final Set<String> SUCCESS_PAYOUT_STATUSES = Set.of("SUCCEEDED", "SUCCESS", "COMPLETED");
    private static final Set<String> FAILED_PAYOUT_STATUSES = Set.of("FAILED", "REJECTED", "CANCELLED", "REVERSED");
    private static final Set<WithdrawalStatus> SYNCABLE_WITHDRAWAL_STATUSES = EnumSet.of(
            WithdrawalStatus.approved,
            WithdrawalStatus.processing,
            WithdrawalStatus.completed,
            WithdrawalStatus.failed
    );

    private final WithdrawalRequestRepository withdrawalRequestRepository;
    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final PayoutGateway payoutGateway;

    @Override
    @Transactional
    public WithdrawalRequest synchronize(UUID requestId, String adminEmail) {
        // adminEmail is null when triggered by the scheduled payout sync job (no admin is acting).
        if (StringUtils.hasText(adminEmail)) {
            userRepository.findByEmail(adminEmail)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        }
        WithdrawalRequest withdrawal = withdrawalRequestRepository.findByIdWithLock(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.WITHDRAWAL_REQUEST_NOT_FOUND));

        if (!SYNCABLE_WITHDRAWAL_STATUSES.contains(withdrawal.getStatus())
                || !StringUtils.hasText(withdrawal.getPayosPayoutId())) {
            throw new AppException(ErrorCode.INVALID_WITHDRAWAL_STATUS);
        }

        if (withdrawal.getStatus() == WithdrawalStatus.completed || withdrawal.getStatus() == WithdrawalStatus.failed) {
            log.info(
                    "Skipping payout synchronization for withdrawal {} because it is already terminal with status={}.",
                    withdrawal.getId(),
                    withdrawal.getStatus()
            );
            return withdrawal;
        }

        WithdrawalStatus previousStatus = withdrawal.getStatus();
        long startedAt = System.nanoTime();
        PayoutGatewayStatusResponse payoutStatus = payoutGateway.getStatus(withdrawal.getPayosPayoutId());
        long latencyMs = (System.nanoTime() - startedAt) / 1_000_000;

        String remoteStatus = normalizeStatus(payoutStatus.getStatus());
        withdrawal.setPayosStatus(remoteStatus);
        withdrawal.setPayosReferenceId(firstNonBlank(
                withdrawal.getPayosReferenceId(),
                payoutStatus.getTransferReference()
        ));

        if (isSuccessStatus(remoteStatus)) {
            if (withdrawal.getTransaction() != null) {
                withdrawal.setStatus(WithdrawalStatus.completed);
                WithdrawalRequest updated = withdrawalRequestRepository.save(withdrawal);
                log.info(
                        "Withdrawal {} already had a transaction. Marked as completed without duplicate wallet update. payosPayoutId={}, status={}, latencyMs={}",
                        updated.getId(),
                        updated.getPayosPayoutId(),
                        remoteStatus,
                        latencyMs
                );
                return updated;
            }

            Wallet wallet = walletRepository.findByUserIdWithLock(withdrawal.getUser().getId())
                    .orElseThrow(() -> new AppException(ErrorCode.WALLET_NOT_FOUND));
            normalizeWalletCurrency(wallet);

            if (wallet.getBalance().compareTo(withdrawal.getAmount()) < 0) {
                throw new AppException(ErrorCode.INSUFFICIENT_BALANCE);
            }

            wallet.setBalance(wallet.getBalance().subtract(withdrawal.getAmount()));
            walletRepository.save(wallet);

            Transaction transaction = new Transaction();
            transaction.setWallet(wallet);
            transaction.setRelatedUser(null);
            transaction.setAmount(withdrawal.getAmount().negate());
            transaction.setType(TxnType.withdrawal);
            transaction.setReferenceId(firstNonBlank(
                    withdrawal.getPayosReferenceId(),
                    payoutStatus.getTransferReference(),
                    payoutStatus.getProviderReference(),
                    withdrawal.getTransferReference()
            ));
            transaction.setDescription(WITHDRAWAL_TXN_DESCRIPTION);
            transaction = transactionRepository.save(transaction);

            withdrawal.setTransaction(transaction);
            withdrawal.setStatus(WithdrawalStatus.completed);
            withdrawal.setProcessedAt(withdrawal.getProcessedAt() != null ? withdrawal.getProcessedAt() : Instant.now());

            WithdrawalRequest updated = withdrawalRequestRepository.save(withdrawal);
            auditLogService.publishAuto(
                    AuditAction.withdrawal_completed,
                    AuditTarget.withdrawal_request,
                    updated.getId(),
                    Map.of("status", previousStatus.name()),
                    buildAuditPayload(updated, payoutStatus),
                    "PayOS confirmed payout success. Wallet balance was deducted and a withdrawal transaction was created."
            );
            log.info(
                    "Withdrawal {} synchronized to COMPLETED. payosPayoutId={}, referenceId={}, providerReference={}, oldStatus={}, newStatus={}, latencyMs={}",
                    updated.getId(),
                    updated.getPayosPayoutId(),
                    updated.getPayosReferenceId(),
                    payoutStatus.getProviderReference(),
                    previousStatus,
                    updated.getStatus(),
                    latencyMs
            );
            return updated;
        }

        if (isFailureStatus(remoteStatus)) {
            withdrawal.setStatus(WithdrawalStatus.failed);
            withdrawal.setProcessedAt(withdrawal.getProcessedAt() != null ? withdrawal.getProcessedAt() : Instant.now());
            withdrawal.setRemark(mergeRemarkSections(
                    withdrawal.getRemark(),
                    "PayOS failure reason",
                    payoutStatus.getFailureReason()
            ));

            WithdrawalRequest updated = withdrawalRequestRepository.save(withdrawal);
            auditLogService.publishAuto(
                    AuditAction.transaction_failed,
                    AuditTarget.withdrawal_request,
                    updated.getId(),
                    Map.of("status", previousStatus.name()),
                    buildAuditPayload(updated, payoutStatus),
                    "PayOS reported payout failure. Wallet balance remains unchanged."
            );
            log.info(
                    "Withdrawal {} synchronized to FAILED. payosPayoutId={}, referenceId={}, providerReference={}, oldStatus={}, newStatus={}, latencyMs={}",
                    updated.getId(),
                    updated.getPayosPayoutId(),
                    updated.getPayosReferenceId(),
                    payoutStatus.getProviderReference(),
                    previousStatus,
                    updated.getStatus(),
                    latencyMs
            );
            return updated;
        }

        WithdrawalRequest updated = withdrawalRequestRepository.save(withdrawal);
        log.info(
                "Withdrawal {} remains PROCESSING after payout synchronization. payosPayoutId={}, payosStatus={}, oldStatus={}, newStatus={}, latencyMs={}",
                updated.getId(),
                updated.getPayosPayoutId(),
                remoteStatus,
                previousStatus,
                updated.getStatus(),
                latencyMs
        );
        return updated;
    }

    private void normalizeWalletCurrency(Wallet wallet) {
        if (!DEFAULT_CURRENCY.equalsIgnoreCase(wallet.getCurrency())) {
            wallet.setCurrency(DEFAULT_CURRENCY);
        }
    }

    private boolean isSuccessStatus(String status) {
        return SUCCESS_PAYOUT_STATUSES.contains(status);
    }

    private boolean isFailureStatus(String status) {
        return FAILED_PAYOUT_STATUSES.contains(status);
    }

    private String normalizeStatus(String status) {
        if (!StringUtils.hasText(status)) {
            throw new AppException(ErrorCode.PAYOUT_STATUS_INVALID_RESPONSE);
        }
        return status.trim().toUpperCase(Locale.ROOT);
    }

    private Map<String, Object> buildAuditPayload(WithdrawalRequest withdrawal, PayoutGatewayStatusResponse payoutStatus) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("status", withdrawal.getStatus().name());
        payload.put("payosPayoutId", Objects.requireNonNullElse(withdrawal.getPayosPayoutId(), ""));
        payload.put("payosReferenceId", Objects.requireNonNullElse(withdrawal.getPayosReferenceId(), ""));
        payload.put("payosStatus", Objects.requireNonNullElse(withdrawal.getPayosStatus(), ""));
        payload.put("providerReference", Objects.requireNonNullElse(payoutStatus.getProviderReference(), ""));
        payload.put("failureReason", Objects.requireNonNullElse(payoutStatus.getFailureReason(), ""));
        return payload;
    }

    private String mergeRemarkSections(String existingRemark, String newLabel, String newValue) {
        if (!StringUtils.hasText(newValue)) {
            return existingRemark;
        }

        String newSection = newLabel + ": " + newValue.trim();
        if (!StringUtils.hasText(existingRemark)) {
            return newSection;
        }
        return existingRemark.trim() + "\n" + newSection;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value.trim();
            }
        }
        return null;
    }
}
