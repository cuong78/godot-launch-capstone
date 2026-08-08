package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.request.CreateDisputeRequest;
import com.godotlaunch.backend.dto.request.ResolveDisputeRequest;
import com.godotlaunch.backend.dto.response.DisputeResponse;

import java.util.List;
import java.util.UUID;

public interface DisputeService {
    /** B tạo dispute tố A. Auto-suspend sản phẩm bị tố. */
    DisputeResponse createDispute(CreateDisputeRequest request, String reporterEmail);

    /** Admin xử lý dispute theo cây quyết định (TH1/2/3). */
    DisputeResponse resolveDispute(UUID disputeId, ResolveDisputeRequest request, String adminEmail);

    /** Admin xác nhận seller đã nạp đủ refundAmount vào ví — trả tiền cho reporter, mở lại role. */
    DisputeResponse confirmRefund(UUID disputeId, String adminEmail);

    /** Gọi từ scheduler khi seller quá hạn refundDeadline mà chưa hoàn tiền — ban vĩnh viễn. */
    void banOverdueSeller(UUID disputeId);

    List<DisputeResponse> getAllDisputes();
    List<DisputeResponse> getMyReportedDisputes(String email);
    DisputeResponse getDispute(UUID disputeId);
}
