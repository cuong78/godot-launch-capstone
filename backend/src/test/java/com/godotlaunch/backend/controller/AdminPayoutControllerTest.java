package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.PayoutGatewayBalanceResponse;
import com.godotlaunch.backend.service.PayoutBalanceService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminPayoutControllerTest {

    @Mock
    private PayoutBalanceService payoutBalanceService;

    @InjectMocks
    private AdminPayoutController controller;

    @Test
    @DisplayName("getBalance_ShouldReturnSuccess")
    void getBalance_ShouldReturnSuccess() {
        PayoutGatewayBalanceResponse responseDto = PayoutGatewayBalanceResponse.builder().build();
        when(payoutBalanceService.getCurrentBalance()).thenReturn(responseDto);

        ResponseEntity<ApiResponse<PayoutGatewayBalanceResponse>> response = controller.getBalance();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData()).isNotNull();
    }
}
