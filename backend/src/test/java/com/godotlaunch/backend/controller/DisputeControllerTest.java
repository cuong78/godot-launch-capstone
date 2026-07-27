package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.CreateDisputeRequest;
import com.godotlaunch.backend.dto.request.ResolveDisputeRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.DisputeResponse;
import com.godotlaunch.backend.service.DisputeService;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DisputeControllerTest {

    @Mock
    private DisputeService disputeService;

    @Mock
    private Principal principal;

    @InjectMocks
    private DisputeController disputeController;

    private UUID disputeId;
    private DisputeResponse disputeResponse;
    private String email;

    @BeforeEach
    void setUp() {
        disputeId = UUID.randomUUID();
        email = "user@godotlaunch.dev";
        disputeResponse = DisputeResponse.builder()
                .id(disputeId)
                .reason("Copyright Issue")
                .status("open")
                .build();
    }

    @Test
    @DisplayName("shouldCreateDispute_WhenRequestIsValid")
    void shouldCreateDispute_WhenRequestIsValid() {
        CreateDisputeRequest request = new CreateDisputeRequest();
        when(principal.getName()).thenReturn(email);
        when(disputeService.createDispute(request, email)).thenReturn(disputeResponse);

        ResponseEntity<ApiResponse<DisputeResponse>> response = disputeController.createDispute(request, principal);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getId()).isEqualTo(disputeId);
    }

    @Test
    @DisplayName("shouldGetMyReports_WhenAuthenticated")
    void shouldGetMyReports_WhenAuthenticated() {
        when(principal.getName()).thenReturn(email);
        when(disputeService.getMyReportedDisputes(email)).thenReturn(List.of(disputeResponse));

        ResponseEntity<ApiResponse<List<DisputeResponse>>> response = disputeController.myReports(principal);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData()).hasSize(1);
    }

    @Test
    @DisplayName("shouldGetAllDisputes_WhenAdmin")
    void shouldGetAllDisputes_WhenAdmin() {
        when(disputeService.getAllDisputes()).thenReturn(List.of(disputeResponse));

        ResponseEntity<ApiResponse<List<DisputeResponse>>> response = disputeController.all();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData()).hasSize(1);
    }

    @Test
    @DisplayName("shouldGetDisputeDetail_WhenAdmin")
    void shouldGetDisputeDetail_WhenAdmin() {
        when(disputeService.getDispute(disputeId)).thenReturn(disputeResponse);

        ResponseEntity<ApiResponse<DisputeResponse>> response = disputeController.detail(disputeId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getId()).isEqualTo(disputeId);
    }

    @Test
    @DisplayName("shouldResolveDispute_WhenAdminResolves")
    void shouldResolveDispute_WhenAdminResolves() {
        ResolveDisputeRequest request = new ResolveDisputeRequest();
        when(principal.getName()).thenReturn(email);
        when(disputeService.resolveDispute(disputeId, request, email)).thenReturn(disputeResponse);

        ResponseEntity<ApiResponse<DisputeResponse>> response = disputeController.resolve(disputeId, request, principal);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(disputeService, times(1)).resolveDispute(disputeId, request, email);
    }
}
