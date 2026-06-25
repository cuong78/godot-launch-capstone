package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.request.CreateWithdrawalRequest;
import com.godotlaunch.backend.dto.request.ReviewWithdrawalRequest;
import com.godotlaunch.backend.dto.response.WithdrawalRequestResponse;

import java.util.List;
import java.util.UUID;

public interface WithdrawalRequestService {
    WithdrawalRequestResponse createWithdrawalRequest(CreateWithdrawalRequest request, String email);
    List<WithdrawalRequestResponse> getMyWithdrawalRequests(String email);
    List<WithdrawalRequestResponse> getAllWithdrawalRequests();
    WithdrawalRequestResponse getWithdrawalRequest(UUID id, String email);
    WithdrawalRequestResponse reviewWithdrawalRequest(UUID requestId, ReviewWithdrawalRequest request, String adminEmail);
}
