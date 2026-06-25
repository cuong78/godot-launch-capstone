package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.CreatePaymentRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.PaymentResponse;
import com.godotlaunch.backend.dto.response.PaymentStatusSummaryResponse;
import com.godotlaunch.backend.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Tag(name = "Payment API", description = "PayOS payment flow for marketplace orders")
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/create")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'DEVELOPER')")
    @Operation(summary = "Create or resume a PayOS payment for one marketplace order")
    public ResponseEntity<ApiResponse<PaymentResponse>> createPayment(
            @Valid @RequestBody CreatePaymentRequest request,
            Principal principal) {
        PaymentResponse payment = paymentService.createPayOSPayment(request, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(payment, "PayOS payment session created successfully"));
    }

    @PostMapping("/{paymentId}/confirm")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'DEVELOPER', 'ADMIN')")
    @Operation(summary = "Refresh the current payment state from PayOS")
    public ResponseEntity<ApiResponse<PaymentResponse>> confirmPayment(
            @PathVariable UUID paymentId,
            Principal principal) {
        PaymentResponse payment = paymentService.confirmPayment(paymentId, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(payment, "Payment status refreshed successfully"));
    }

    @PostMapping("/{paymentId}/cancel")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'DEVELOPER')")
    @Operation(summary = "Cancel an active PayOS payment")
    public ResponseEntity<ApiResponse<PaymentResponse>> cancelPayment(
            @PathVariable UUID paymentId,
            Principal principal) {
        PaymentResponse payment = paymentService.cancelPayment(paymentId, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(payment, "Payment cancelled successfully"));
    }

    @GetMapping("/my-payments")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'DEVELOPER')")
    @Operation(summary = "Get current user payment history")
    public ResponseEntity<ApiResponse<java.util.List<PaymentResponse>>> getCurrentUserPayments(Principal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                paymentService.getCurrentUserPayments(principal.getName()),
                "Payments retrieved successfully"
        ));
    }

    @PostMapping("/webhook")
    @Operation(summary = "Handle PayOS webhook callback")
    public ResponseEntity<ApiResponse<PaymentResponse>> handleWebhook(@RequestBody Map<String, Object> payload) {
        PaymentResponse payment = paymentService.handleWebhook(payload);
        return ResponseEntity.ok(ApiResponse.success(payment, "Webhook processed successfully"));
    }

    @GetMapping("/{paymentId}")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'DEVELOPER', 'ADMIN')")
    @Operation(summary = "Get payment detail by payment id")
    public ResponseEntity<ApiResponse<PaymentResponse>> getPaymentById(
            @PathVariable UUID paymentId,
            Principal principal) {
        PaymentResponse payment = paymentService.getPaymentById(paymentId, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(payment, "Payment retrieved successfully"));
    }

    @GetMapping("/order/{orderId}")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'DEVELOPER', 'ADMIN')")
    @Operation(summary = "Get payment detail by order id")
    public ResponseEntity<ApiResponse<PaymentResponse>> getPaymentByOrder(
            @PathVariable UUID orderId,
            Principal principal) {
        PaymentResponse payment = paymentService.getPaymentByOrder(orderId, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(payment, "Payment retrieved successfully"));
    }

    @GetMapping("/status/{orderId}")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'DEVELOPER', 'ADMIN')")
    @Operation(summary = "Get payment status summary by order id")
    public ResponseEntity<ApiResponse<PaymentStatusSummaryResponse>> getPaymentStatus(
            @PathVariable UUID orderId,
            Principal principal) {
        PaymentStatusSummaryResponse paymentStatus = paymentService.getPaymentStatus(orderId, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(paymentStatus, "Payment status retrieved successfully"));
    }
}
