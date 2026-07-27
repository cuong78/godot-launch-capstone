package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.dto.response.PayoutGatewayBalanceResponse;
import com.godotlaunch.backend.repository.PayoutGateway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PayoutBalanceServiceImplTest {

    @Mock
    private PayoutGateway payoutGateway;

    @InjectMocks
    private PayoutBalanceServiceImpl service;

    @Test
    void getCurrentBalance_ShouldReturnBalance() {
        PayoutGatewayBalanceResponse mockRes = PayoutGatewayBalanceResponse.builder().build();
        when(payoutGateway.getBalance()).thenReturn(mockRes);

        PayoutGatewayBalanceResponse result = service.getCurrentBalance();

        assertThat(result).isSameAs(mockRes);
        verify(payoutGateway, times(1)).getBalance();
    }
}
