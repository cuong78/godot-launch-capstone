package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.request.CreatePaymentRequest;
import com.godotlaunch.backend.dto.request.PaymentVerificationRequest;
import com.godotlaunch.backend.dto.request.UploadReceiptRequest;
import com.godotlaunch.backend.dto.response.PaymentResponse;
import org.springframework.core.io.Resource;

import java.util.List;
import java.util.UUID;

public interface PaymentService {
    PaymentResponse createPayment(CreatePaymentRequest request, String buyerEmail);
    PaymentResponse uploadReceipt(UUID paymentId, UploadReceiptRequest request, String buyerEmail);
    PaymentResponse approvePayment(UUID paymentId, String adminEmail);
    PaymentResponse rejectPayment(UUID paymentId, PaymentVerificationRequest request, String adminEmail);
    PaymentResponse getPaymentByOrder(UUID orderId, String requesterEmail);
    PaymentResponse getPaymentById(UUID paymentId);
    List<PaymentResponse> getPendingPayments();
    Resource loadReceiptFile(UUID paymentId, String requesterEmail);
}
