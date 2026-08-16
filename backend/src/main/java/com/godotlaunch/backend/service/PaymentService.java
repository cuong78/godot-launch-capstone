package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.request.CreatePaymentRequest;
import com.godotlaunch.backend.dto.request.CreateTopUpRequest;
import com.godotlaunch.backend.dto.response.PaymentResponse;
import com.godotlaunch.backend.dto.response.PaymentStatusSummaryResponse;

import java.util.List;
import java.util.UUID;

public interface PaymentService {
    PaymentResponse createPayOSPayment(CreatePaymentRequest request, String buyerEmail);
    PaymentResponse createTopUpPayment(CreateTopUpRequest request, String buyerEmail);
    PaymentResponse createDisputeRepaymentPayment(UUID disputeId, String sellerEmail);
    PaymentResponse confirmPayment(UUID paymentId, String requesterEmail);
    PaymentResponse cancelPayment(UUID paymentId, String requesterEmail);
    PaymentResponse handleWebhook(Object payload);
    List<PaymentResponse> getCurrentUserPayments(String requesterEmail);
    PaymentResponse getPaymentByOrder(UUID orderId, String requesterEmail);
    PaymentResponse getPaymentById(UUID paymentId, String requesterEmail);
    PaymentStatusSummaryResponse getPaymentStatus(UUID orderId, String requesterEmail);
    List<PaymentResponse> getAdminPayments();
    java.util.Map<UUID, java.util.Map<com.godotlaunch.backend.entity.enums.PaymentStatus, Long>> getPaymentStatusStatsBySeller(UUID sellerId);
}
