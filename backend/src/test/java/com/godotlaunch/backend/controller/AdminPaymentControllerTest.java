package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.PaymentResponse;
import com.godotlaunch.backend.service.PaymentService;
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
class AdminPaymentControllerTest {

    @Mock
    private PaymentService paymentService;

    @Mock
    private Principal principal;

    @InjectMocks
    private AdminPaymentController controller;

    @Test
    @DisplayName("getAdminPayments_ShouldReturnSuccess")
    void getAdminPayments_ShouldReturnSuccess() {
        PaymentResponse responseDto = new PaymentResponse();
        when(paymentService.getAdminPayments()).thenReturn(List.of(responseDto));

        ResponseEntity<ApiResponse<List<PaymentResponse>>> response = controller.getAdminPayments();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData()).hasSize(1);
    }

    @Test
    @DisplayName("getPaymentDetail_ShouldReturnSuccess")
    void getPaymentDetail_ShouldReturnSuccess() {
        UUID paymentId = UUID.randomUUID();
        String username = "admin@example.com";
        PaymentResponse responseDto = new PaymentResponse();

        when(principal.getName()).thenReturn(username);
        when(paymentService.getPaymentById(paymentId, username)).thenReturn(responseDto);

        ResponseEntity<ApiResponse<PaymentResponse>> response = controller.getPaymentDetail(paymentId, principal);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData()).isNotNull();
    }
}
