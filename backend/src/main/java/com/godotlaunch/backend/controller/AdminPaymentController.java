package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.PaymentVerificationRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.PaymentResponse;
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
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/payments")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@Tag(name = "Admin Payment API", description = "Admin verification flow for manual bank transfer payments")
public class AdminPaymentController {

    private final PaymentService paymentService;

    @GetMapping("/pending")
    @Operation(summary = "Get payments waiting verification")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> getPendingPayments() {
        return ResponseEntity.ok(ApiResponse.success(
                paymentService.getPendingPayments(),
                "Pending payments retrieved successfully"
        ));
    }

    @GetMapping("/{paymentId}")
    @Operation(summary = "Get payment detail by payment id")
    public ResponseEntity<ApiResponse<PaymentResponse>> getPaymentDetail(@PathVariable UUID paymentId) {
        return ResponseEntity.ok(ApiResponse.success(
                paymentService.getPaymentById(paymentId),
                "Payment detail retrieved successfully"
        ));
    }

    @PostMapping("/{paymentId}/approve")
    @Operation(summary = "Approve a payment and release seller revenue")
    public ResponseEntity<ApiResponse<PaymentResponse>> approvePayment(
            @PathVariable UUID paymentId,
            Principal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                paymentService.approvePayment(paymentId, principal.getName()),
                "Payment approved successfully"
        ));
    }

    @PostMapping("/{paymentId}/reject")
    @Operation(summary = "Reject a payment receipt")
    public ResponseEntity<ApiResponse<PaymentResponse>> rejectPayment(
            @PathVariable UUID paymentId,
            @Valid @RequestBody PaymentVerificationRequest request,
            Principal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                paymentService.rejectPayment(paymentId, request, principal.getName()),
                "Payment rejected successfully"
        ));
    }
}
