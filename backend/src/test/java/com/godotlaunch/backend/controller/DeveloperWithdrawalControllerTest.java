package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.CreateWithdrawalRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.DeveloperSalesStatsResponse;
import com.godotlaunch.backend.dto.response.DeveloperWalletSummaryResponse;
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
class DeveloperWithdrawalControllerTest {

    @Mock
    private WithdrawalRequestService withdrawalRequestService;

    @Mock
    private Principal principal;

    @InjectMocks
    private DeveloperWithdrawalController developerWithdrawalController;

    private String email;
    private UUID id;
    private WithdrawalDetailResponse detailResponse;

    @BeforeEach
    void setUp() {
        email = "dev@godotlaunch.dev";
        id = UUID.randomUUID();
        detailResponse = new WithdrawalDetailResponse();
    }

    @Test
    @DisplayName("shouldGetWalletSummary_WhenAuthenticated")
    void shouldGetWalletSummary_WhenAuthenticated() {
        DeveloperWalletSummaryResponse summary = new DeveloperWalletSummaryResponse();
        when(principal.getName()).thenReturn(email);
        when(withdrawalRequestService.getDeveloperWalletSummary(email)).thenReturn(summary);

        ResponseEntity<ApiResponse<DeveloperWalletSummaryResponse>> response = developerWithdrawalController.getWalletSummary(principal);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("shouldGetSalesStats_WhenAuthenticated")
    void shouldGetSalesStats_WhenAuthenticated() {
        DeveloperSalesStatsResponse stats = new DeveloperSalesStatsResponse();
        when(principal.getName()).thenReturn(email);
        when(withdrawalRequestService.getDeveloperSalesStats(email)).thenReturn(stats);

        ResponseEntity<ApiResponse<DeveloperSalesStatsResponse>> response = developerWithdrawalController.getSalesStats(principal);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("shouldGetDeveloperWithdrawals_WhenAuthenticated")
    void shouldGetDeveloperWithdrawals_WhenAuthenticated() {
        WithdrawalResponse wr = new WithdrawalResponse();
        when(principal.getName()).thenReturn(email);
        when(withdrawalRequestService.getDeveloperWithdrawals(email)).thenReturn(List.of(wr));

        ResponseEntity<ApiResponse<List<WithdrawalResponse>>> response = developerWithdrawalController.getDeveloperWithdrawals(principal);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("shouldCreateDeveloperWithdrawal_WhenRequestIsValid")
    void shouldCreateDeveloperWithdrawal_WhenRequestIsValid() {
        CreateWithdrawalRequest request = new CreateWithdrawalRequest();
        when(principal.getName()).thenReturn(email);
        when(withdrawalRequestService.createDeveloperWithdrawal(request, email)).thenReturn(detailResponse);

        ResponseEntity<ApiResponse<WithdrawalDetailResponse>> response = developerWithdrawalController.createDeveloperWithdrawal(request, principal);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    @DisplayName("shouldGetDeveloperWithdrawalDetail_WhenExists")
    void shouldGetDeveloperWithdrawalDetail_WhenExists() {
        when(principal.getName()).thenReturn(email);
        when(withdrawalRequestService.getDeveloperWithdrawalDetail(id, email)).thenReturn(detailResponse);

        ResponseEntity<ApiResponse<WithdrawalDetailResponse>> response = developerWithdrawalController.getDeveloperWithdrawalDetail(id, principal);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
