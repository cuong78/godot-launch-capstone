package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.CreatePaymentRequest;
import com.godotlaunch.backend.dto.request.UploadReceiptRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.PaymentResponse;
import com.godotlaunch.backend.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
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
@Tag(name = "Payment API", description = "Customer manual bank transfer payment flow")
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping
    @PreAuthorize("hasAnyRole('CUSTOMER', 'DEVELOPER')")
    @Operation(summary = "Create payment for one marketplace order")
    public ResponseEntity<ApiResponse<PaymentResponse>> createPayment(
            @Valid @RequestBody CreatePaymentRequest request,
            Principal principal) {
        PaymentResponse payment = paymentService.createPayment(request, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(payment, "Payment order created successfully"));
    }

    @PostMapping(value = "/{paymentId}/receipt", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('CUSTOMER', 'DEVELOPER')")
    @Operation(summary = "Upload transfer receipt for a payment")
    public ResponseEntity<ApiResponse<PaymentResponse>> uploadReceipt(
            @PathVariable UUID paymentId,
            @Valid @ModelAttribute UploadReceiptRequest request,
            Principal principal) {
        PaymentResponse payment = paymentService.uploadReceipt(paymentId, request, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(payment, "Receipt uploaded successfully"));
    }

    @GetMapping("/order/{orderId}")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'DEVELOPER', 'ADMIN')")
    @Operation(summary = "Get payment detail by order")
    public ResponseEntity<ApiResponse<PaymentResponse>> getPaymentByOrder(
            @PathVariable UUID orderId,
            Principal principal) {
        PaymentResponse payment = paymentService.getPaymentByOrder(orderId, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(payment, "Payment retrieved successfully"));
    }

    @GetMapping("/order/{orderId}/status")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'DEVELOPER', 'ADMIN')")
    @Operation(summary = "Get payment status by order")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPaymentStatus(
            @PathVariable UUID orderId,
            Principal principal) {
        PaymentResponse payment = paymentService.getPaymentByOrder(orderId, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(
                Map.of(
                        "paymentId", payment.getId(),
                        "orderId", payment.getOrderId(),
                        "paymentStatus", payment.getPaymentStatus(),
                        "downloadUrl", payment.getDownloadUrl() != null ? payment.getDownloadUrl() : ""
                ),
                "Payment status retrieved successfully"
        ));
    }

    @GetMapping("/{paymentId}/receipt-file")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'DEVELOPER', 'ADMIN')")
    @Operation(summary = "Stream locally stored receipt file for the current payment")
    public ResponseEntity<Resource> getReceiptFile(
            @PathVariable UUID paymentId,
            Principal principal) {
        Resource resource = paymentService.loadReceiptFile(paymentId, principal.getName());
        MediaType mediaType = MediaTypeFactory.getMediaType(resource).orElse(MediaType.APPLICATION_OCTET_STREAM);
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .body(resource);
    }
}
