package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.PayoutGatewayCreateRequest;
import com.godotlaunch.backend.dto.response.PayoutGatewayBalanceResponse;
import com.godotlaunch.backend.dto.response.PayoutGatewayCreateResponse;
import com.godotlaunch.backend.dto.response.PayoutGatewayFeeEstimateResponse;
import com.godotlaunch.backend.dto.response.PayoutGatewayStatusResponse;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.PayoutGateway;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import vn.payos.PayOS;
import vn.payos.exception.APIException;
import vn.payos.exception.ConnectionException;
import vn.payos.exception.ConnectionTimeoutException;
import vn.payos.exception.PayOSException;
import vn.payos.model.v1.payouts.Payout;
import vn.payos.model.v1.payouts.PayoutApprovalState;
import vn.payos.model.v1.payouts.PayoutRequests;
import vn.payos.model.v1.payouts.PayoutTransaction;
import vn.payos.model.v1.payouts.PayoutTransactionState;
import vn.payos.model.v1.payoutsAccount.PayoutAccountInfo;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;

@Component
@Slf4j
public class PayOSPayoutGateway implements PayoutGateway {

    @SuppressWarnings("unused")
    private final PayOS payOS;

    public PayOSPayoutGateway(@Qualifier("payoutPayOS") PayOS payOS) {
        this.payOS = payOS;
    }

    @Override
    public PayoutGatewayCreateResponse createPayout(PayoutGatewayCreateRequest request) {
        long startedAt = System.nanoTime();
        log.info(
                "Calling PayOS Create Payout API for withdrawalId={}, amount={}, toBin={}, accountEnding={}, category={}",
                request.getWithdrawalRequestId(),
                request.getAmount(),
                request.getToBankBin(),
                maskAccountNumber(request.getBankAccount()),
                request.getCategories()
        );

        try {
            Payout payout = payOS.payouts().create(
                    PayoutRequests.builder()
                            .referenceId(request.getWithdrawalRequestId().toString())
                            .amount(toLongAmount(request.getAmount()))
                            .description(request.getDescription())
                            .toBin(request.getToBankBin())
                            .toAccountNumber(request.getBankAccount())
                            .category(request.getCategories())
                            .build()
            );
            long latencyMs = toLatencyMs(startedAt);
            PayoutGatewayCreateResponse mapped = mapCreateResponse(payout);
            log.info(
                    "PayOS Create Payout response received in {} ms for withdrawalId={}, payoutId={}, status={}, referenceId={}",
                    latencyMs,
                    request.getWithdrawalRequestId(),
                    mapped.getPayoutId(),
                    mapped.getStatus(),
                    mapped.getReferenceId()
            );
            return mapped;
        } catch (ConnectionTimeoutException | ConnectionException ex) {
            log.error("PayOS Create Payout timed out/connection failed after {} ms for withdrawalId={}.", toLatencyMs(startedAt), request.getWithdrawalRequestId(), ex);
            throw new AppException(ErrorCode.PAYOUT_CREATE_FAILED);
        } catch (APIException ex) {
            log.error(
                    "PayOS Create Payout returned an error after {} ms for withdrawalId={}. status={}, code={}, desc={}",
                    toLatencyMs(startedAt),
                    request.getWithdrawalRequestId(),
                    ex.getStatusCode().orElse(null),
                    ex.getErrorCode().orElse(null),
                    ex.getErrorDesc().orElse(null),
                    ex
            );
            throw new AppException(ErrorCode.PAYOUT_CREATE_FAILED);
        } catch (PayOSException ex) {
            log.error("Unexpected PayOS SDK error while creating payout after {} ms for withdrawalId={}.", toLatencyMs(startedAt), request.getWithdrawalRequestId(), ex);
            throw new AppException(ErrorCode.PAYOUT_CREATE_FAILED);
        } catch (AppException ex) {
            log.error("Invalid PayOS payout create response detected after {} ms for withdrawalId={}.", toLatencyMs(startedAt), request.getWithdrawalRequestId(), ex);
            throw ex;
        } catch (Exception ex) {
            log.error("Unexpected error while creating PayOS payout after {} ms for withdrawalId={}.", toLatencyMs(startedAt), request.getWithdrawalRequestId(), ex);
            throw new AppException(ErrorCode.PAYOUT_CREATE_FAILED);
        }
    }

    @Override
    public PayoutGatewayBalanceResponse getBalance() {
        long startedAt = System.nanoTime();
        log.info("Calling PayOS Balance API for payout account.");

        try {
            PayoutAccountInfo response = payOS.payoutsAccount().balance();
            long latencyMs = toLatencyMs(startedAt);
            PayoutGatewayBalanceResponse mapped = mapBalanceResponse(response);
            log.info(
                    "PayOS Balance API response received in {} ms for payout account ending with {}.",
                    latencyMs,
                    maskAccountNumber(mapped.getAccountNumber())
            );
            return mapped;
        } catch (ConnectionTimeoutException | ConnectionException ex) {
            log.error("PayOS Balance API timed out/connection failed after {} ms.", toLatencyMs(startedAt), ex);
            throw new AppException(ErrorCode.PAYOUT_BALANCE_FETCH_FAILED);
        } catch (APIException ex) {
            log.error(
                    "PayOS Balance API returned an error after {} ms. status={}, code={}, desc={}",
                    toLatencyMs(startedAt),
                    ex.getStatusCode().orElse(null),
                    ex.getErrorCode().orElse(null),
                    ex.getErrorDesc().orElse(null),
                    ex
            );
            throw new AppException(ErrorCode.PAYOUT_BALANCE_FETCH_FAILED);
        } catch (PayOSException ex) {
            log.error("Unexpected PayOS SDK error while fetching payout balance after {} ms.", toLatencyMs(startedAt), ex);
            throw new AppException(ErrorCode.PAYOUT_BALANCE_FETCH_FAILED);
        } catch (AppException ex) {
            log.error("Invalid PayOS payout balance response detected after {} ms.", toLatencyMs(startedAt), ex);
            throw ex;
        } catch (Exception ex) {
            log.error("Unexpected error while fetching PayOS payout balance after {} ms.", toLatencyMs(startedAt), ex);
            throw new AppException(ErrorCode.PAYOUT_BALANCE_FETCH_FAILED);
        }
    }

    @Override
    public PayoutGatewayStatusResponse getStatus(String payoutId) {
        long startedAt = System.nanoTime();
        log.info("Calling PayOS Payout Status API for payoutId={}.", payoutId);

        try {
            Payout payout = payOS.payouts().get(payoutId);
            long latencyMs = toLatencyMs(startedAt);
            PayoutGatewayStatusResponse mapped = mapStatusResponse(payout);
            log.info(
                    "PayOS Payout Status response received in {} ms for payoutId={}, status={}, providerReference={}",
                    latencyMs,
                    payoutId,
                    mapped.getStatus(),
                    mapped.getProviderReference()
            );
            return mapped;
        } catch (ConnectionTimeoutException | ConnectionException ex) {
            log.error("PayOS Payout Status timed out/connection failed after {} ms for payoutId={}.", toLatencyMs(startedAt), payoutId, ex);
            throw new AppException(ErrorCode.PAYOUT_STATUS_FETCH_FAILED);
        } catch (APIException ex) {
            log.error(
                    "PayOS Payout Status returned an error after {} ms for payoutId={}. status={}, code={}, desc={}",
                    toLatencyMs(startedAt),
                    payoutId,
                    ex.getStatusCode().orElse(null),
                    ex.getErrorCode().orElse(null),
                    ex.getErrorDesc().orElse(null),
                    ex
            );
            throw new AppException(ErrorCode.PAYOUT_STATUS_FETCH_FAILED);
        } catch (PayOSException ex) {
            log.error("Unexpected PayOS SDK error while fetching payout status after {} ms for payoutId={}.", toLatencyMs(startedAt), payoutId, ex);
            throw new AppException(ErrorCode.PAYOUT_STATUS_FETCH_FAILED);
        } catch (AppException ex) {
            log.error("Invalid PayOS payout status response detected after {} ms for payoutId={}.", toLatencyMs(startedAt), payoutId, ex);
            throw ex;
        } catch (Exception ex) {
            log.error("Unexpected error while fetching PayOS payout status after {} ms for payoutId={}.", toLatencyMs(startedAt), payoutId, ex);
            throw new AppException(ErrorCode.PAYOUT_STATUS_FETCH_FAILED);
        }
    }

    @Override
    public PayoutGatewayFeeEstimateResponse estimateFee(PayoutGatewayCreateRequest request) {
        throw unsupported("estimateFee");
    }

    private UnsupportedOperationException unsupported(String operation) {
        log.debug("PayOS payout operation '{}' was invoked before implementation.", operation);
        return new UnsupportedOperationException(
                "PayOS payout integration is not implemented yet for operation: " + operation
        );
    }

    private PayoutGatewayBalanceResponse mapBalanceResponse(PayoutAccountInfo response) {
        if (response == null
                || !StringUtils.hasText(response.getAccountNumber())
                || !StringUtils.hasText(response.getAccountName())
                || !StringUtils.hasText(response.getCurrency())
                || !StringUtils.hasText(response.getBalance())) {
            throw new AppException(ErrorCode.PAYOUT_BALANCE_INVALID_RESPONSE);
        }

        try {
            BigDecimal balance = new BigDecimal(response.getBalance().trim());
            return PayoutGatewayBalanceResponse.builder()
                    .accountNumber(response.getAccountNumber().trim())
                    .accountName(response.getAccountName().trim())
                    .currency(response.getCurrency().trim())
                    .balance(balance)
                    .status("active")
                    .build();
        } catch (NumberFormatException ex) {
            throw new AppException(ErrorCode.PAYOUT_BALANCE_INVALID_RESPONSE);
        }
    }

    private PayoutGatewayCreateResponse mapCreateResponse(Payout payout) {
        if (payout == null
                || !StringUtils.hasText(payout.getId())
                || !StringUtils.hasText(payout.getReferenceId())
                || payout.getApprovalState() == null
                || !StringUtils.hasText(payout.getCreatedAt())) {
            throw new AppException(ErrorCode.PAYOUT_CREATE_INVALID_RESPONSE);
        }

        return PayoutGatewayCreateResponse.builder()
                .payoutId(payout.getId().trim())
                .referenceId(payout.getReferenceId().trim())
                .status(resolveApprovalState(payout.getApprovalState()))
                .providerReference(extractProviderReference(extractLatestTransaction(payout.getTransactions())))
                .createdAt(payout.getCreatedAt().trim())
                .build();
    }

    private PayoutGatewayStatusResponse mapStatusResponse(Payout payout) {
        if (payout == null
                || !StringUtils.hasText(payout.getId())
                || payout.getApprovalState() == null) {
            throw new AppException(ErrorCode.PAYOUT_STATUS_INVALID_RESPONSE);
        }

        PayoutTransaction latestTransaction = extractLatestTransaction(payout.getTransactions());
        return PayoutGatewayStatusResponse.builder()
                .payoutId(payout.getId().trim())
                .transferReference(StringUtils.hasText(payout.getReferenceId()) ? payout.getReferenceId().trim() : null)
                .status(resolvePayoutStatus(payout.getApprovalState(), latestTransaction))
                .providerReference(extractProviderReference(latestTransaction))
                .processedAt(extractProcessedAt(payout, latestTransaction))
                .failureReason(extractFailureReason(latestTransaction))
                .build();
    }

    private long toLongAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new AppException(ErrorCode.PAYOUT_CREATE_INVALID_RESPONSE);
        }
        return amount.setScale(0, RoundingMode.HALF_UP).longValueExact();
    }

    private long toLatencyMs(long startedAt) {
        return (System.nanoTime() - startedAt) / 1_000_000;
    }

    private String resolveApprovalState(PayoutApprovalState state) {
        if (state == null) {
            return null;
        }
        String value = state.getValue();
        return StringUtils.hasText(value) ? value.trim().toUpperCase(Locale.ROOT) : state.name();
    }

    private String resolvePayoutStatus(PayoutApprovalState approvalState, PayoutTransaction latestTransaction) {
        if (latestTransaction != null && latestTransaction.getState() != null) {
            return resolveTransactionState(latestTransaction.getState());
        }
        return resolveApprovalState(approvalState);
    }

    private String resolveTransactionState(PayoutTransactionState state) {
        if (state == null) {
            return null;
        }
        String value = state.getValue();
        return StringUtils.hasText(value) ? value.trim().toUpperCase(Locale.ROOT) : state.name();
    }

    private PayoutTransaction extractLatestTransaction(List<PayoutTransaction> transactions) {
        if (transactions == null || transactions.isEmpty()) {
            return null;
        }

        for (int index = transactions.size() - 1; index >= 0; index--) {
            if (transactions.get(index) != null) {
                return transactions.get(index);
            }
        }
        return null;
    }

    private String extractProviderReference(PayoutTransaction transaction) {
        if (transaction == null) {
            return null;
        }

        if (StringUtils.hasText(transaction.getReference())) {
            return transaction.getReference().trim();
        }
        if (StringUtils.hasText(transaction.getReferenceId())) {
            return transaction.getReferenceId().trim();
        }
        return null;
    }

    private String extractProcessedAt(Payout payout, PayoutTransaction latestTransaction) {
        if (latestTransaction != null && StringUtils.hasText(latestTransaction.getTransactionDatetime())) {
            return latestTransaction.getTransactionDatetime().trim();
        }
        return StringUtils.hasText(payout.getCreatedAt()) ? payout.getCreatedAt().trim() : null;
    }

    private String extractFailureReason(PayoutTransaction latestTransaction) {
        if (latestTransaction == null) {
            return null;
        }

        if (StringUtils.hasText(latestTransaction.getErrorMessage())) {
            return latestTransaction.getErrorMessage().trim();
        }
        if (StringUtils.hasText(latestTransaction.getErrorCode())) {
            return latestTransaction.getErrorCode().trim();
        }
        return null;
    }

    private String maskAccountNumber(String accountNumber) {
        if (!StringUtils.hasText(accountNumber)) {
            return "unknown";
        }

        String normalized = accountNumber.trim();
        if (normalized.length() <= 4) {
            return normalized;
        }
        return normalized.substring(normalized.length() - 4);
    }
}
