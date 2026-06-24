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

    List<DisputeResponse> getAllDisputes();
    List<DisputeResponse> getMyReportedDisputes(String email);
    DisputeResponse getDispute(UUID disputeId);
}
