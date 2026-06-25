package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.PaymentResponse;
import com.godotlaunch.backend.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/payments")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@Tag(name = "Admin Payment API", description = "Admin monitoring endpoints for PayOS payments")
public class AdminPaymentController {

    private final PaymentService paymentService;

    @GetMapping
    @Operation(summary = "Get recent payments for admin monitoring")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> getAdminPayments() {
        return ResponseEntity.ok(ApiResponse.success(
                paymentService.getAdminPayments(),
                "Payments retrieved successfully"
        ));
    }

    @GetMapping("/{paymentId}")
    @Operation(summary = "Get payment detail by payment id for admin")
    public ResponseEntity<ApiResponse<PaymentResponse>> getPaymentDetail(
            @PathVariable UUID paymentId,
            Principal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                paymentService.getPaymentById(paymentId, principal.getName()),
                "Payment detail retrieved successfully"
        ));
    }
}
