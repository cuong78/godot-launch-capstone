package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.RejectWithdrawalRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.WithdrawalDetailResponse;
import com.godotlaunch.backend.dto.response.WithdrawalResponse;
import com.godotlaunch.backend.service.WithdrawalRequestService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminWithdrawalControllerTest {

    @Mock
    private WithdrawalRequestService withdrawalRequestService;

    @Mock
    private Principal principal;

    @InjectMocks
    private AdminWithdrawalController adminWithdrawalController;

    private UUID withdrawalId;
    private WithdrawalDetailResponse detailResponse;
    private String adminEmail;

    @BeforeEach
    void setUp() {
        withdrawalId = UUID.randomUUID();
        detailResponse = new WithdrawalDetailResponse();
        adminEmail = "admin@godotlaunch.dev";
    }

    @Test
    @DisplayName("shouldGetAdminWithdrawals_WhenRequested")
    void shouldGetAdminWithdrawals_WhenRequested() {
        when(withdrawalRequestService.getAdminWithdrawals()).thenReturn(List.of(new WithdrawalResponse()));

        ResponseEntity<ApiResponse<List<WithdrawalResponse>>> response = adminWithdrawalController.getAdminWithdrawals();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("shouldGetAdminWithdrawalDetail_WhenExists")
    void shouldGetAdminWithdrawalDetail_WhenExists() {
        when(withdrawalRequestService.getAdminWithdrawalDetail(withdrawalId)).thenReturn(detailResponse);

        ResponseEntity<ApiResponse<WithdrawalDetailResponse>> response = adminWithdrawalController.getAdminWithdrawalDetail(withdrawalId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("shouldSyncWithdrawal_WhenRequested")
    void shouldSyncWithdrawal_WhenRequested() {
        when(principal.getName()).thenReturn(adminEmail);
        when(withdrawalRequestService.syncWithdrawalStatus(withdrawalId, adminEmail)).thenReturn(detailResponse);

        ResponseEntity<ApiResponse<WithdrawalDetailResponse>> response = adminWithdrawalController.syncWithdrawal(withdrawalId, principal);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("shouldRejectWithdrawal_WhenAdminRejects")
    void shouldRejectWithdrawal_WhenAdminRejects() {
        RejectWithdrawalRequest request = new RejectWithdrawalRequest();
        when(principal.getName()).thenReturn(adminEmail);
        when(withdrawalRequestService.rejectWithdrawal(withdrawalId, request, adminEmail)).thenReturn(detailResponse);

        ResponseEntity<ApiResponse<WithdrawalDetailResponse>> response = adminWithdrawalController.rejectWithdrawal(withdrawalId, request, principal);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
