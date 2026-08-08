package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.request.CreateWithdrawalRequest;
import com.godotlaunch.backend.dto.request.ApproveWithdrawalRequest;
import com.godotlaunch.backend.dto.request.RejectWithdrawalRequest;
import com.godotlaunch.backend.dto.response.DeveloperSalesStatsResponse;
import com.godotlaunch.backend.dto.response.DeveloperWalletSummaryResponse;
import com.godotlaunch.backend.dto.response.WithdrawalDetailResponse;
import com.godotlaunch.backend.dto.response.WithdrawalResponse;

import java.util.List;
import java.util.UUID;

public interface WithdrawalRequestService {
    DeveloperWalletSummaryResponse getDeveloperWalletSummary(String email);
    DeveloperSalesStatsResponse getDeveloperSalesStats(String email);
    WithdrawalDetailResponse createDeveloperWithdrawal(CreateWithdrawalRequest request, String email);
    List<WithdrawalResponse> getDeveloperWithdrawals(String email);
    WithdrawalDetailResponse getDeveloperWithdrawalDetail(UUID id, String email);
    List<WithdrawalResponse> getAdminWithdrawals();
    WithdrawalDetailResponse getAdminWithdrawalDetail(UUID id);
    WithdrawalDetailResponse approveWithdrawal(UUID requestId, ApproveWithdrawalRequest request, String adminEmail);
    WithdrawalDetailResponse syncWithdrawalStatus(UUID requestId, String adminEmail);
    WithdrawalDetailResponse rejectWithdrawal(UUID requestId, RejectWithdrawalRequest request, String adminEmail);
}
