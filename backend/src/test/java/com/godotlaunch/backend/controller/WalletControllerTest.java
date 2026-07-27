package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.TransactionResponse;
import com.godotlaunch.backend.dto.response.WalletResponse;
import com.godotlaunch.backend.service.WalletService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.security.Principal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WalletControllerTest {

    @Mock
    private WalletService walletService;

    @Mock
    private Principal principal;

    @InjectMocks
    private WalletController walletController;

    @Test
    @DisplayName("shouldGetMyWallet_WhenAuthenticated")
    void shouldGetMyWallet_WhenAuthenticated() {
        // Arrange
        String email = "dev@godotlaunch.dev";
        WalletResponse walletResponse = WalletResponse.builder()
                .balance(BigDecimal.TEN)
                .currency("VND")
                .build();
        when(principal.getName()).thenReturn(email);
        when(walletService.getWalletResponse(email)).thenReturn(walletResponse);

        // Act
        ResponseEntity<ApiResponse<WalletResponse>> response = walletController.getMyWallet(principal);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getBalance()).isEqualTo(BigDecimal.TEN);
        verify(walletService, times(1)).getWalletResponse(email);
    }

    @Test
    @DisplayName("shouldGetMyTransactionHistory_WhenAuthenticated")
    void shouldGetMyTransactionHistory_WhenAuthenticated() {
        // Arrange
        String email = "dev@godotlaunch.dev";
        Pageable pageable = PageRequest.of(0, 10);
        TransactionResponse txn = new TransactionResponse();
        Page<TransactionResponse> page = new PageImpl<>(List.of(txn), pageable, 1);

        when(principal.getName()).thenReturn(email);
        when(walletService.getTransactionHistory(email, pageable)).thenReturn(page);

        // Act
        ResponseEntity<ApiResponse<Page<TransactionResponse>>> response = walletController.getMyTransactionHistory(principal, pageable);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getContent()).hasSize(1);
        verify(walletService, times(1)).getTransactionHistory(email, pageable);
    }
}
