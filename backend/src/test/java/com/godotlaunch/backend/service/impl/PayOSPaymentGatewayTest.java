package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.PaymentGatewayCreateRequest;
import com.godotlaunch.backend.dto.response.PaymentGatewayCreateResponse;
import com.godotlaunch.backend.dto.response.PaymentGatewayStatusResponse;
import com.godotlaunch.backend.dto.response.PaymentGatewayWebhookResult;
import com.godotlaunch.backend.entity.enums.PaymentStatus;
import com.godotlaunch.backend.exception.AppException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.payos.PayOS;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkRequest;
import vn.payos.model.v2.paymentRequests.PaymentLink;
import vn.payos.model.v2.paymentRequests.PaymentLinkItem;
import vn.payos.model.v2.paymentRequests.PaymentLinkStatus;
import vn.payos.model.webhooks.WebhookData;
import vn.payos.service.blocking.v2.paymentRequests.PaymentRequestsService;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PayOSPaymentGatewayTest {

    @Mock
    private PayOS payOS;

    @Mock
    private PaymentRequestsService paymentRequestsService;

    @InjectMocks
    private PayOSPaymentGateway gateway;

    @Test
    @DisplayName("shouldCreatePayment_WhenCallGateway")
    void shouldCreatePayment_WhenCallGateway() throws Exception {
        PaymentGatewayCreateRequest request = PaymentGatewayCreateRequest.builder()
                .orderCode(123456L)
                .amount(50000L)
                .description("Test order")
                .cancelUrl("http://cancel")
                .returnUrl("http://return")
                .buyerName("Buyer")
                .buyerEmail("buyer@example.com")
                .expiredAt(9999999999L)
                .itemName("Item")
                .build();

        vn.payos.model.v2.paymentRequests.CreatePaymentLinkResponse linkResponse =
                vn.payos.model.v2.paymentRequests.CreatePaymentLinkResponse.builder()
                        .orderCode(123456L)
                        .paymentLinkId("link-123")
                        .checkoutUrl("http://checkout")
                        .qrCode("qr-code")
                        .status(PaymentLinkStatus.PENDING)
                        .bin("970403")
                        .accountName("Test")
                        .accountNumber("123")
                        .amount(50000L)
                        .description("Test description")
                        .currency("VND")
                        .build();

        when(payOS.paymentRequests()).thenReturn(paymentRequestsService);
        when(paymentRequestsService.create(any(CreatePaymentLinkRequest.class))).thenReturn(linkResponse);

        PaymentGatewayCreateResponse response = gateway.createPayment(request);

        assertThat(response.getCheckoutUrl()).isEqualTo("http://checkout");
        assertThat(response.getPaymentLinkId()).isEqualTo("link-123");
    }

    @Test
    @DisplayName("shouldGetPaymentStatus_WhenCallGateway")
    void shouldGetPaymentStatus_WhenCallGateway() throws Exception {
        PaymentLink paymentLink = PaymentLink.builder()
                .orderCode(123456L)
                .id("link-123")
                .status(PaymentLinkStatus.PENDING)
                .transactions(Collections.emptyList())
                .amount(50000L)
                .amountPaid(0L)
                .amountRemaining(50000L)
                .createdAt("2026-07-26T12:00:00Z")
                .build();

        when(payOS.paymentRequests()).thenReturn(paymentRequestsService);
        when(paymentRequestsService.get(123456L)).thenReturn(paymentLink);

        PaymentGatewayStatusResponse response = gateway.getPaymentStatus(123456L);

        assertThat(response.getPaymentLinkId()).isEqualTo("link-123");
        assertThat(response.getStatus()).isEqualTo(PaymentStatus.PENDING);
    }

    @Test
    @DisplayName("shouldCancelPayment_WhenCallGateway")
    void shouldCancelPayment_WhenCallGateway() throws Exception {
        PaymentLink paymentLink = PaymentLink.builder()
                .orderCode(123456L)
                .id("link-123")
                .status(PaymentLinkStatus.CANCELLED)
                .transactions(Collections.emptyList())
                .amount(50000L)
                .amountPaid(0L)
                .amountRemaining(50000L)
                .createdAt("2026-07-26T12:00:00Z")
                .build();

        when(payOS.paymentRequests()).thenReturn(paymentRequestsService);
        when(paymentRequestsService.cancel(123456L, "Cancelled by buyer")).thenReturn(paymentLink);

        PaymentGatewayStatusResponse response = gateway.cancelPayment(123456L);

        assertThat(response.getStatus()).isEqualTo(PaymentStatus.CANCELLED);
    }

    @Test
    @DisplayName("shouldVerifyWebhook_WhenPayloadValid")
    void shouldVerifyWebhook_WhenPayloadValid() throws Exception {
        WebhookData data = WebhookData.builder()
                .orderCode(123456L)
                .amount(50000L)
                .paymentLinkId("link-123")
                .desc("order description")
                .description("order description")
                .reference("ref-123")
                .transactionDateTime("2026-07-26T12:00:00Z")
                .accountNumber("123456789")
                .currency("VND")
                .code("00")
                .build();

        vn.payos.service.blocking.webhooks.WebhooksService webhooksService = mock(vn.payos.service.blocking.webhooks.WebhooksService.class);
        when(payOS.webhooks()).thenReturn(webhooksService);
        when(webhooksService.verify(any())).thenReturn(data);

        PaymentGatewayWebhookResult result = gateway.verifyWebhook("dummy-payload");

        assertThat(result.getOrderCode()).isEqualTo(123456L);
        assertThat(result.getAmount()).isEqualTo(50000L);
    }

    @Test
    void createPayment_ShouldThrowException_WhenGatewayFails() throws Exception {
        lenient().when(payOS.paymentRequests()).thenReturn(paymentRequestsService);
        lenient().when(paymentRequestsService.create(any())).thenThrow(new RuntimeException("API error"));

        PaymentGatewayCreateRequest request = PaymentGatewayCreateRequest.builder()
                .orderCode(123456L)
                .amount(50000L)
                .build();

        assertThatThrownBy(() -> gateway.createPayment(request))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.PAYMENT_GATEWAY_ERROR);
    }

    @Test
    void getPaymentStatus_ShouldThrowException_WhenGatewayFails() throws Exception {
        lenient().when(payOS.paymentRequests()).thenReturn(paymentRequestsService);
        lenient().when(paymentRequestsService.get(123456L)).thenThrow(new RuntimeException("API error"));

        assertThatThrownBy(() -> gateway.getPaymentStatus(123456L))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.PAYMENT_GATEWAY_ERROR);
    }

    @Test
    void cancelPayment_ShouldThrowException_WhenGatewayFails() throws Exception {
        lenient().when(payOS.paymentRequests()).thenReturn(paymentRequestsService);
        lenient().when(paymentRequestsService.cancel(123456L, "Cancelled by buyer")).thenThrow(new RuntimeException("API error"));

        assertThatThrownBy(() -> gateway.cancelPayment(123456L))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.PAYMENT_GATEWAY_ERROR);
    }

    @Test
    void verifyWebhook_ShouldReturnValidationTrue_WhenValidationPayloadReceived() {
        java.util.Map<String, Object> data = new java.util.HashMap<>();
        data.put("orderCode", 123L);
        data.put("amount", 3000L);
        data.put("description", "VQRIO123");
        data.put("reference", "TF230204212323");
        data.put("paymentLinkId", "124c33293c43417ab7879e14c8d9eb18");

        java.util.Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("data", data);

        vn.payos.service.blocking.webhooks.WebhooksService webhooksService = mock(vn.payos.service.blocking.webhooks.WebhooksService.class);
        lenient().when(payOS.webhooks()).thenReturn(webhooksService);
        lenient().when(webhooksService.verify(any())).thenThrow(new RuntimeException("invalid signature"));

        PaymentGatewayWebhookResult result = gateway.verifyWebhook(payload);

        assertThat(result.isValidationRequest()).isTrue();
    }

    @Test
    void verifyWebhook_ShouldThrowException_WhenInvalidPayload() {
        vn.payos.service.blocking.webhooks.WebhooksService webhooksService = mock(vn.payos.service.blocking.webhooks.WebhooksService.class);
        lenient().when(payOS.webhooks()).thenReturn(webhooksService);
        lenient().when(webhooksService.verify(any())).thenThrow(new RuntimeException("invalid signature"));

        assertThatThrownBy(() -> gateway.verifyWebhook("invalid-payload"))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.PAYMENT_WEBHOOK_INVALID);
    }
}
