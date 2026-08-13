package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.PaymentGatewayCreateRequest;
import com.godotlaunch.backend.dto.response.PaymentGatewayCreateResponse;
import com.godotlaunch.backend.dto.response.PaymentGatewayStatusResponse;
import com.godotlaunch.backend.dto.response.PaymentGatewayWebhookResult;
import com.godotlaunch.backend.entity.enums.PaymentStatus;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.PaymentGateway;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import vn.payos.PayOS;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkRequest;
import vn.payos.model.v2.paymentRequests.PaymentLink;
import vn.payos.model.v2.paymentRequests.PaymentLinkItem;
import vn.payos.model.v2.paymentRequests.PaymentLinkStatus;
import vn.payos.model.webhooks.WebhookData;

import java.util.List;
import java.util.Map;
import java.util.Objects;

@Component
@RequiredArgsConstructor
@Slf4j
public class PayOSPaymentGateway implements PaymentGateway {

    private static final int PAYOS_DESCRIPTION_LIMIT = 25;
    private static final int PAYOS_ITEM_NAME_LIMIT = 25;
    private static final long PAYOS_VALIDATION_ORDER_CODE = 123L;
    private static final long PAYOS_VALIDATION_AMOUNT = 3000L;
    private static final String PAYOS_VALIDATION_DESCRIPTION = "VQRIO123";
    private static final String PAYOS_VALIDATION_REFERENCE = "TF230204212323";
    private static final String PAYOS_VALIDATION_PAYMENT_LINK_ID = "124c33293c43417ab7879e14c8d9eb18";

    private final PayOS payOS;

    @Override
    public PaymentGatewayCreateResponse createPayment(PaymentGatewayCreateRequest request) {
        try {
            CreatePaymentLinkRequest payload = CreatePaymentLinkRequest.builder()
                    .orderCode(request.getOrderCode())
                    .amount(request.getAmount())
                    .description(truncate(request.getDescription(), PAYOS_DESCRIPTION_LIMIT, "GODOTLAUNCH"))
                    .cancelUrl(request.getCancelUrl())
                    .returnUrl(request.getReturnUrl())
                    .buyerName(request.getBuyerName())
                    .buyerEmail(request.getBuyerEmail())
                    .expiredAt(request.getExpiredAt())
                    .items(List.of(
                            PaymentLinkItem.builder()
                                    .name(truncate(request.getItemName(), PAYOS_ITEM_NAME_LIMIT, "Marketplace Item"))
                                    .quantity(1)
                                    .price(request.getAmount())
                                    .build()
                    ))
                    .build();

            var response = payOS.paymentRequests().create(payload);
            return PaymentGatewayCreateResponse.builder()
                    .orderCode(response.getOrderCode())
                    .paymentLinkId(response.getPaymentLinkId())
                    .checkoutUrl(response.getCheckoutUrl())
                    .qrCode(response.getQrCode())
                    .bin(response.getBin())
                    .bankAccountNumber(response.getAccountNumber())
                    .bankAccountName(response.getAccountName())
                    .status(mapStatus(response.getStatus()))
                    .build();
        } catch (Exception ex) {
            log.error("Failed to create PayOS payment link for order code {}", request.getOrderCode(), ex);
            throw new AppException(ErrorCode.PAYMENT_GATEWAY_ERROR);
        }
    }

    @Override
    public PaymentGatewayStatusResponse getPaymentStatus(Long orderCode) {
        try {
            return mapPaymentLink(payOS.paymentRequests().get(orderCode));
        } catch (Exception ex) {
            log.error("Failed to fetch PayOS payment status for order code {}", orderCode, ex);
            throw new AppException(ErrorCode.PAYMENT_GATEWAY_ERROR);
        }
    }

    @Override
    public PaymentGatewayStatusResponse cancelPayment(Long orderCode) {
        try {
            return mapPaymentLink(payOS.paymentRequests().cancel(orderCode, "Cancelled by buyer"));
        } catch (Exception ex) {
            log.error("Failed to cancel PayOS payment for order code {}", orderCode, ex);
            throw new AppException(ErrorCode.PAYMENT_GATEWAY_ERROR);
        }
    }

    @Override
    public PaymentGatewayWebhookResult verifyWebhook(Object payload) {
        try {
            WebhookData data = payOS.webhooks().verify(payload);
            return mapWebhookResult(data, isValidationWebhook(data));
        } catch (Exception ex) {
            if (isValidationWebhookPayload(payload)) {
                log.info("Received PayOS webhook URL validation payload. Skipping payment processing and returning success.");
                return PaymentGatewayWebhookResult.builder()
                        .validationRequest(true)
                        .build();
            }
            log.error("Failed to verify PayOS webhook payload", ex);
            throw new AppException(ErrorCode.PAYMENT_WEBHOOK_INVALID);
        }
    }

    private PaymentGatewayWebhookResult mapWebhookResult(WebhookData data, boolean validationRequest) {
        return PaymentGatewayWebhookResult.builder()
                .orderCode(data.getOrderCode())
                .amount(data.getAmount())
                .paymentLinkId(data.getPaymentLinkId())
                .transactionReference(firstNonBlank(data.getReference(), data.getCode()))
                .occurredAt(data.getTransactionDateTime())
                .validationRequest(validationRequest)
                .build();
    }

    private PaymentGatewayStatusResponse mapPaymentLink(PaymentLink paymentLink) {
        vn.payos.model.v2.paymentRequests.Transaction latestTransaction =
                paymentLink.getTransactions() != null && !paymentLink.getTransactions().isEmpty()
                        ? paymentLink.getTransactions().get(paymentLink.getTransactions().size() - 1)
                        : null;

        return PaymentGatewayStatusResponse.builder()
                .orderCode(paymentLink.getOrderCode())
                .paymentLinkId(paymentLink.getId())
                .status(mapStatus(paymentLink.getStatus()))
                .transactionReference(latestTransaction != null ? latestTransaction.getReference() : null)
                .paidAt(latestTransaction != null ? latestTransaction.getTransactionDateTime() : null)
                .build();
    }

    private PaymentStatus mapStatus(PaymentLinkStatus status) {
        if (status == null) {
            return PaymentStatus.PENDING;
        }

        switch (status.name()) {
            case "PAID":
                return PaymentStatus.PAID;
            case "PROCESSING":
            case "UNDERPAID":
                return PaymentStatus.PROCESSING;
            case "CANCELLED":
                return PaymentStatus.CANCELLED;
            case "FAILED":
                return PaymentStatus.FAILED;
            case "EXPIRED":
                return PaymentStatus.EXPIRED;
            case "PENDING":
            default:
                return PaymentStatus.PENDING;
        }
    }

    private String truncate(String value, int limit, String fallback) {
        String normalized = StringUtils.hasText(value) ? value.trim() : fallback;
        return normalized.length() <= limit ? normalized : normalized.substring(0, limit);
    }

    private boolean isValidationWebhook(WebhookData data) {
        if (data == null) {
            return false;
        }

        return Objects.equals(data.getOrderCode(), PAYOS_VALIDATION_ORDER_CODE)
                && Objects.equals(data.getAmount(), PAYOS_VALIDATION_AMOUNT)
                && Objects.equals(data.getDescription(), PAYOS_VALIDATION_DESCRIPTION)
                && Objects.equals(data.getReference(), PAYOS_VALIDATION_REFERENCE)
                && Objects.equals(data.getPaymentLinkId(), PAYOS_VALIDATION_PAYMENT_LINK_ID);
    }

    private boolean isValidationWebhookPayload(Object payload) {
        if (!(payload instanceof Map<?, ?> rootPayload)) {
            return false;
        }

        Object dataObject = rootPayload.get("data");
        if (!(dataObject instanceof Map<?, ?> dataPayload)) {
            return false;
        }

        return matchesLong(dataPayload.get("orderCode"), PAYOS_VALIDATION_ORDER_CODE)
                && matchesLong(dataPayload.get("amount"), PAYOS_VALIDATION_AMOUNT)
                && matchesString(dataPayload.get("description"), PAYOS_VALIDATION_DESCRIPTION)
                && matchesString(dataPayload.get("reference"), PAYOS_VALIDATION_REFERENCE)
                && matchesString(dataPayload.get("paymentLinkId"), PAYOS_VALIDATION_PAYMENT_LINK_ID);
    }

    private boolean matchesLong(Object value, long expected) {
        if (value instanceof Number numberValue) {
            return numberValue.longValue() == expected;
        }

        if (value instanceof String stringValue && StringUtils.hasText(stringValue)) {
            try {
                return Long.parseLong(stringValue.trim()) == expected;
            } catch (NumberFormatException ignored) {
                return false;
            }
        }

        return false;
    }

    private boolean matchesString(Object value, String expected) {
        return value instanceof String stringValue && expected.equals(stringValue.trim());
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
