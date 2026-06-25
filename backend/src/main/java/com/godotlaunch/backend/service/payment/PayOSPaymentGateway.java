package com.godotlaunch.backend.service.payment;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.entity.enums.PaymentStatus;
import com.godotlaunch.backend.exception.AppException;
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

@Component
@RequiredArgsConstructor
@Slf4j
public class PayOSPaymentGateway implements PaymentGateway {

    private static final int PAYOS_DESCRIPTION_LIMIT = 25;
    private static final int PAYOS_ITEM_NAME_LIMIT = 25;

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
            return PaymentGatewayWebhookResult.builder()
                    .orderCode(data.getOrderCode())
                    .amount(data.getAmount())
                    .paymentLinkId(data.getPaymentLinkId())
                    .transactionReference(firstNonBlank(data.getReference(), data.getCode()))
                    .occurredAt(data.getTransactionDateTime())
                    .build();
        } catch (Exception ex) {
            log.error("Failed to verify PayOS webhook payload", ex);
            throw new AppException(ErrorCode.PAYMENT_WEBHOOK_INVALID);
        }
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

        return switch (status) {
            case PAID -> PaymentStatus.PAID;
            case PROCESSING, UNDERPAID -> PaymentStatus.PROCESSING;
            case CANCELLED -> PaymentStatus.CANCELLED;
            case FAILED -> PaymentStatus.FAILED;
            case EXPIRED -> PaymentStatus.EXPIRED;
            case PENDING -> PaymentStatus.PENDING;
        };
    }

    private String truncate(String value, int limit, String fallback) {
        String normalized = StringUtils.hasText(value) ? value.trim() : fallback;
        return normalized.length() <= limit ? normalized : normalized.substring(0, limit);
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
