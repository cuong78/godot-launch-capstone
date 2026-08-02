package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.CreatePaymentRequest;
import com.godotlaunch.backend.dto.request.CreateTopUpRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.PaymentResponse;
import com.godotlaunch.backend.dto.response.PaymentStatusSummaryResponse;
import com.godotlaunch.backend.entity.enums.PaymentStatus;
import com.godotlaunch.backend.service.PaymentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentControllerTest {

    @Mock
    private PaymentService paymentService;

    @Mock
    private Principal principal;

    @InjectMocks
    private PaymentController paymentController;

    private String email;
    private UUID paymentId;
    private UUID orderId;
    private PaymentResponse paymentResponse;

    @BeforeEach
    void setUp() {
        email = "buyer@godotlaunch.dev";
        paymentId = UUID.randomUUID();
        orderId = UUID.randomUUID();

        paymentResponse = PaymentResponse.builder()
                .id(paymentId)
                .orderId(orderId)
                .checkoutUrl("http://checkout-url")
                .paymentStatus(PaymentStatus.PENDING)
                .build();
    }

    @Test
    @DisplayName("shouldCreatePayment_WhenRequestIsValid")
    void shouldCreatePayment_WhenRequestIsValid() {
        CreatePaymentRequest request = new CreatePaymentRequest();
        when(principal.getName()).thenReturn(email);
        when(paymentService.createPayOSPayment(any(), eq(email))).thenReturn(paymentResponse);

        ResponseEntity<ApiResponse<PaymentResponse>> response = paymentController.createPayment(request, principal);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getId()).isEqualTo(paymentId);
    }

    @Test
    @DisplayName("shouldCreateTopUp_WhenRequestIsValid")
    void shouldCreateTopUp_WhenRequestIsValid() {
        CreateTopUpRequest request = new CreateTopUpRequest();
        when(principal.getName()).thenReturn(email);
        when(paymentService.createTopUpPayment(any(), eq(email))).thenReturn(paymentResponse);

        ResponseEntity<ApiResponse<PaymentResponse>> response = paymentController.createTopUp(request, principal);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getId()).isEqualTo(paymentId);
    }

    @Test
    @DisplayName("shouldConfirmPayment_WhenCalled")
    void shouldConfirmPayment_WhenCalled() {
        when(principal.getName()).thenReturn(email);
        when(paymentService.confirmPayment(paymentId, email)).thenReturn(paymentResponse);

        ResponseEntity<ApiResponse<PaymentResponse>> response = paymentController.confirmPayment(paymentId, principal);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(paymentService, times(1)).confirmPayment(paymentId, email);
    }

    @Test
    @DisplayName("shouldCancelPayment_WhenCalled")
    void shouldCancelPayment_WhenCalled() {
        when(principal.getName()).thenReturn(email);
        when(paymentService.cancelPayment(paymentId, email)).thenReturn(paymentResponse);

        ResponseEntity<ApiResponse<PaymentResponse>> response = paymentController.cancelPayment(paymentId, principal);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(paymentService, times(1)).cancelPayment(paymentId, email);
    }

    @Test
    @DisplayName("shouldGetCurrentUserPayments_WhenAuthenticated")
    void shouldGetCurrentUserPayments_WhenAuthenticated() {
        when(principal.getName()).thenReturn(email);
        when(paymentService.getCurrentUserPayments(email)).thenReturn(List.of(paymentResponse));

        ResponseEntity<ApiResponse<List<PaymentResponse>>> response = paymentController.getCurrentUserPayments(principal);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData()).hasSize(1);
    }

    @Test
    @DisplayName("shouldHandleWebhook_WhenPayOSCallbackReceived")
    void shouldHandleWebhook_WhenPayOSCallbackReceived() {
        Map<String, Object> payload = Map.of("key", "value");
        when(paymentService.handleWebhook(payload)).thenReturn(paymentResponse);

        ResponseEntity<ApiResponse<PaymentResponse>> response = paymentController.handleWebhook(payload);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(paymentService, times(1)).handleWebhook(payload);
    }

    @Test
    @DisplayName("shouldGetPaymentById_WhenExists")
    void shouldGetPaymentById_WhenExists() {
        when(principal.getName()).thenReturn(email);
        when(paymentService.getPaymentById(paymentId, email)).thenReturn(paymentResponse);

        ResponseEntity<ApiResponse<PaymentResponse>> response = paymentController.getPaymentById(paymentId, principal);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getId()).isEqualTo(paymentId);
    }

    @Test
    @DisplayName("shouldGetPaymentByOrder_WhenExists")
    void shouldGetPaymentByOrder_WhenExists() {
        when(principal.getName()).thenReturn(email);
        when(paymentService.getPaymentByOrder(orderId, email)).thenReturn(paymentResponse);

        ResponseEntity<ApiResponse<PaymentResponse>> response = paymentController.getPaymentByOrder(orderId, principal);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getOrderId()).isEqualTo(orderId);
    }

    @Test
    @DisplayName("shouldGetPaymentStatus_WhenExists")
    void shouldGetPaymentStatus_WhenExists() {
        PaymentStatusSummaryResponse statusSummary = PaymentStatusSummaryResponse.builder()
                .paymentStatus(PaymentStatus.PAID)
                .build();
        when(principal.getName()).thenReturn(email);
        when(paymentService.getPaymentStatus(orderId, email)).thenReturn(statusSummary);

        ResponseEntity<ApiResponse<PaymentStatusSummaryResponse>> response = paymentController.getPaymentStatus(orderId, principal);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
    }
}
