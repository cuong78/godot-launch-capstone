package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.response.PayoutGatewayBalanceResponse;
import com.godotlaunch.backend.dto.response.PayoutGatewayStatusResponse;
import com.godotlaunch.backend.exception.AppException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.payos.PayOS;
import vn.payos.model.v1.payouts.Payout;
import vn.payos.model.v1.payouts.PayoutApprovalState;
import vn.payos.model.v1.payouts.PayoutTransaction;
import vn.payos.model.v1.payouts.PayoutTransactionState;
import vn.payos.model.v1.payoutsAccount.PayoutAccountInfo;
import vn.payos.service.blocking.v1.payouts.PayoutsService;
import vn.payos.service.blocking.v1.payoutsAccount.PayoutsAccountService;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import com.godotlaunch.backend.dto.response.PayoutGatewayCreateResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class PayOSPayoutGatewayTest {

    @Mock
    private PayOS payOS;

    @Mock
    private PayoutsAccountService payoutsAccountService;

    @Mock
    private PayoutsService payoutsService;

    @InjectMocks
    private PayOSPayoutGateway gateway;

    @Test
    void getBalance_ShouldMapPayOSResponse() {
        when(payOS.payoutsAccount()).thenReturn(payoutsAccountService);
        when(payoutsAccountService.balance()).thenReturn(
                PayoutAccountInfo.builder()
                        .accountNumber("1234567890")
                        .accountName("GODOTLAUNCH JSC")
                        .currency("VND")
                        .balance("1500000")
                        .build()
        );

        PayoutGatewayBalanceResponse response = gateway.getBalance();

        assertEquals("1234567890", response.getAccountNumber());
        assertEquals("GODOTLAUNCH JSC", response.getAccountName());
        assertEquals("VND", response.getCurrency());
        assertEquals(new BigDecimal("1500000"), response.getBalance());
        assertEquals("active", response.getStatus());
    }

    @Test
    void getBalance_ShouldThrowAppException_WhenBalanceIsInvalid() {
        when(payOS.payoutsAccount()).thenReturn(payoutsAccountService);
        when(payoutsAccountService.balance()).thenReturn(
                PayoutAccountInfo.builder()
                        .accountNumber("1234567890")
                        .accountName("GODOTLAUNCH JSC")
                        .currency("VND")
                        .balance("invalid")
                        .build()
        );

        AppException exception = assertThrows(AppException.class, () -> gateway.getBalance());
        assertEquals(ErrorCode.PAYOUT_BALANCE_INVALID_RESPONSE, exception.getErrorCode());
    }

    @Test
    void getBalance_ShouldAllowMissingAccountMetadata_WhenBalanceIsPresent() {
        when(payOS.payoutsAccount()).thenReturn(payoutsAccountService);
        when(payoutsAccountService.balance()).thenReturn(
                PayoutAccountInfo.builder()
                        .accountNumber("")
                        .accountName("")
                        .currency("VND")
                        .balance("0")
                        .build()
        );

        PayoutGatewayBalanceResponse response = gateway.getBalance();

        assertEquals(new BigDecimal("0"), response.getBalance());
        assertEquals("VND", response.getCurrency());
        assertEquals("active", response.getStatus());
    }

    @Test
    void getStatus_ShouldMapLatestPayoutTransaction() {
        when(payOS.payouts()).thenReturn(payoutsService);
        when(payoutsService.get("po_123")).thenReturn(
                Payout.builder()
                        .id("po_123")
                        .referenceId("withdrawal-123")
                        .category(List.of("payment"))
                        .approvalState(PayoutApprovalState.PROCESSING)
                        .createdAt("2026-06-28T10:00:00Z")
                        .transactions(List.of(
                                PayoutTransaction.builder()
                                        .id("ptx_123")
                                        .referenceId("payos_ref_123")
                                        .amount(100000L)
                                        .description("Withdrawal #123")
                                        .toBin("970422")
                                        .toAccountNumber("0123456789")
                                        .toAccountName("DEV USER")
                                        .reference("bank_ref_1")
                                        .transactionDatetime("2026-06-28T10:05:00Z")
                                        .state(PayoutTransactionState.SUCCEEDED)
                                        .build()
                        ))
                        .build()
        );

        PayoutGatewayStatusResponse response = gateway.getStatus("po_123");

        assertEquals("po_123", response.getPayoutId());
        assertEquals("withdrawal-123", response.getTransferReference());
        assertEquals("SUCCEEDED", response.getStatus());
        assertEquals("bank_ref_1", response.getProviderReference());
        assertEquals("2026-06-28T10:05:00Z", response.getProcessedAt());
    }

    @Test
    void getStatus_ShouldThrowAppException_WhenResponseIsInvalid() {
        when(payOS.payouts()).thenReturn(payoutsService);
        when(payoutsService.get("po_invalid")).thenReturn(
                Payout.builder()
                        .id(" ")
                        .referenceId("withdrawal-invalid")
                        .transactions(List.of())
                        .category(List.of("payment"))
                        .approvalState(PayoutApprovalState.PROCESSING)
                        .createdAt("2026-06-28T10:00:00Z")
                        .build()
        );

        AppException exception = assertThrows(AppException.class, () -> gateway.getStatus("po_invalid"));
        assertEquals(ErrorCode.PAYOUT_STATUS_INVALID_RESPONSE, exception.getErrorCode());
    }

    @Test
    void createPayout_ShouldSucceed_WhenValid() {
        when(payOS.payouts()).thenReturn(payoutsService);
        Payout mockPayout = Payout.builder()
                .id("po_123")
                .referenceId("withdrawal_123")
                .approvalState(PayoutApprovalState.APPROVED)
                .createdAt("2026-06-28T10:00:00Z")
                .transactions(List.of())
                .build();
        when(payoutsService.create(any())).thenReturn(mockPayout);

        com.godotlaunch.backend.dto.request.PayoutGatewayCreateRequest request = com.godotlaunch.backend.dto.request.PayoutGatewayCreateRequest.builder()
                .withdrawalRequestId(UUID.randomUUID())
                .amount(new BigDecimal("100.00"))
                .description("Withdrawal desc")
                .toBankBin("970422")
                .bankAccount("0123456789")
                .categories(List.of("payment"))
                .build();

        PayoutGatewayCreateResponse response = gateway.createPayout(request);
        assertEquals("po_123", response.getPayoutId());
        assertEquals("withdrawal_123", response.getReferenceId());
    }

    @Test
    void createPayout_ShouldThrowException_WhenConnectionFails() {
        when(payOS.payouts()).thenReturn(payoutsService);
        lenient().when(payoutsService.create(any())).thenThrow(new vn.payos.exception.ConnectionException("connection failed"));

        com.godotlaunch.backend.dto.request.PayoutGatewayCreateRequest request = com.godotlaunch.backend.dto.request.PayoutGatewayCreateRequest.builder()
                .withdrawalRequestId(UUID.randomUUID())
                .amount(new BigDecimal("100.00"))
                .toBankBin("970422")
                .bankAccount("0123456789")
                .build();

        assertThrows(AppException.class, () -> gateway.createPayout(request));
    }

    @Test
    void createPayout_ShouldThrowException_WhenApiFails() {
        when(payOS.payouts()).thenReturn(payoutsService);
        vn.payos.exception.APIException ex = org.mockito.Mockito.mock(vn.payos.exception.APIException.class);
        lenient().when(ex.getStatusCode()).thenReturn(Optional.of(400));
        lenient().when(ex.getErrorCode()).thenReturn(Optional.of("INVALID_BANK"));
        lenient().when(ex.getErrorDesc()).thenReturn(Optional.of("Bank bin not found"));
        lenient().when(payoutsService.create(any())).thenThrow(ex);

        com.godotlaunch.backend.dto.request.PayoutGatewayCreateRequest request = com.godotlaunch.backend.dto.request.PayoutGatewayCreateRequest.builder()
                .withdrawalRequestId(UUID.randomUUID())
                .amount(new BigDecimal("100.00"))
                .toBankBin("970422")
                .bankAccount("0123456789")
                .build();

        assertThrows(AppException.class, () -> gateway.createPayout(request));
    }

    @Test
    void createPayout_ShouldThrowException_WhenPayOsSdkFails() {
        when(payOS.payouts()).thenReturn(payoutsService);
        lenient().when(payoutsService.create(any())).thenThrow(new vn.payos.exception.PayOSException("PayOS sdk error"));

        com.godotlaunch.backend.dto.request.PayoutGatewayCreateRequest request = com.godotlaunch.backend.dto.request.PayoutGatewayCreateRequest.builder()
                .withdrawalRequestId(UUID.randomUUID())
                .amount(new BigDecimal("100.00"))
                .toBankBin("970422")
                .bankAccount("0123456789")
                .build();

        assertThrows(AppException.class, () -> gateway.createPayout(request));
    }

    @Test
    void getBalance_ShouldThrowException_WhenConnectionFails() {
        when(payOS.payoutsAccount()).thenReturn(payoutsAccountService);
        when(payoutsAccountService.balance()).thenThrow(new vn.payos.exception.ConnectionException("connection failed"));

        assertThrows(AppException.class, () -> gateway.getBalance());
    }

    @Test
    void getBalance_ShouldThrowException_WhenApiFails() {
        when(payOS.payoutsAccount()).thenReturn(payoutsAccountService);
        vn.payos.exception.APIException ex = org.mockito.Mockito.mock(vn.payos.exception.APIException.class);
        lenient().when(ex.getStatusCode()).thenReturn(Optional.of(401));
        lenient().when(ex.getErrorCode()).thenReturn(Optional.of("UNAUTHORIZED"));
        lenient().when(ex.getErrorDesc()).thenReturn(Optional.of("Invalid API keys"));
        when(payoutsAccountService.balance()).thenThrow(ex);

        assertThrows(AppException.class, () -> gateway.getBalance());
    }

    @Test
    void getStatus_ShouldThrowException_WhenConnectionFails() {
        when(payOS.payouts()).thenReturn(payoutsService);
        when(payoutsService.get("po_123")).thenThrow(new vn.payos.exception.ConnectionException("connection failed"));

        assertThrows(AppException.class, () -> gateway.getStatus("po_123"));
    }

    @Test
    void getStatus_ShouldThrowException_WhenApiFails() {
        when(payOS.payouts()).thenReturn(payoutsService);
        vn.payos.exception.APIException ex = org.mockito.Mockito.mock(vn.payos.exception.APIException.class);
        lenient().when(ex.getStatusCode()).thenReturn(Optional.of(404));
        lenient().when(ex.getErrorCode()).thenReturn(Optional.of("NOT_FOUND"));
        lenient().when(ex.getErrorDesc()).thenReturn(Optional.of("Payout not found"));
        when(payoutsService.get("po_123")).thenThrow(ex);

        assertThrows(AppException.class, () -> gateway.getStatus("po_123"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void findPayoutByReferenceId_ShouldReturnPayout_WhenExists() {
        when(payOS.payouts()).thenReturn(payoutsService);
        Payout mockPayout = Payout.builder()
                .id("po_123")
                .referenceId("ref_123")
                .approvalState(PayoutApprovalState.APPROVED)
                .createdAt("2026-06-28T10:00:00Z")
                .transactions(List.of())
                .build();

        vn.payos.core.Page<Payout> mockPage = org.mockito.Mockito.mock(vn.payos.core.Page.class);
        when(mockPage.getItems()).thenReturn(List.of(mockPayout));
        when(payoutsService.list(any())).thenReturn(mockPage);

        Optional<PayoutGatewayCreateResponse> result = gateway.findPayoutByReferenceId("ref_123");
        assertEquals(true, result.isPresent());
        assertEquals("po_123", result.get().getPayoutId());
    }

    @Test
    @SuppressWarnings("unchecked")
    void findPayoutByReferenceId_ShouldReturnEmpty_WhenNotExists() {
        when(payOS.payouts()).thenReturn(payoutsService);
        vn.payos.core.Page<Payout> mockPage = org.mockito.Mockito.mock(vn.payos.core.Page.class);
        when(mockPage.getItems()).thenReturn(List.of());
        when(payoutsService.list(any())).thenReturn(mockPage);

        Optional<PayoutGatewayCreateResponse> result = gateway.findPayoutByReferenceId("ref_123");
        assertEquals(false, result.isPresent());
    }

    @Test
    void findPayoutByReferenceId_ShouldReturnEmpty_WhenExceptionThrown() {
        when(payOS.payouts()).thenReturn(payoutsService);
        when(payoutsService.list(any())).thenThrow(new RuntimeException("API error"));

        Optional<PayoutGatewayCreateResponse> result = gateway.findPayoutByReferenceId("ref_123");
        assertEquals(false, result.isPresent());
    }

    @Test
    void createPayout_ShouldThrowException_WhenTimeout() {
        when(payOS.payouts()).thenReturn(payoutsService);
        lenient().when(payoutsService.create(any())).thenThrow(new vn.payos.exception.ConnectionTimeoutException("timeout"));

        com.godotlaunch.backend.dto.request.PayoutGatewayCreateRequest request = com.godotlaunch.backend.dto.request.PayoutGatewayCreateRequest.builder()
                .withdrawalRequestId(UUID.randomUUID())
                .amount(new BigDecimal("100.00"))
                .toBankBin("970422")
                .bankAccount("0123456789")
                .build();

        assertThrows(AppException.class, () -> gateway.createPayout(request));
    }

    @Test
    void createPayout_ShouldThrowException_WhenAppException() {
        when(payOS.payouts()).thenReturn(payoutsService);
        lenient().when(payoutsService.create(any())).thenThrow(new AppException(ErrorCode.BAD_REQUEST));

        com.godotlaunch.backend.dto.request.PayoutGatewayCreateRequest request = com.godotlaunch.backend.dto.request.PayoutGatewayCreateRequest.builder()
                .withdrawalRequestId(UUID.randomUUID())
                .amount(new BigDecimal("100.00"))
                .toBankBin("970422")
                .bankAccount("0123456789")
                .build();

        assertThrows(AppException.class, () -> gateway.createPayout(request));
    }

    @Test
    void createPayout_ShouldThrowException_WhenGenericException() {
        when(payOS.payouts()).thenReturn(payoutsService);
        lenient().when(payoutsService.create(any())).thenThrow(new RuntimeException("Unexpected error"));

        com.godotlaunch.backend.dto.request.PayoutGatewayCreateRequest request = com.godotlaunch.backend.dto.request.PayoutGatewayCreateRequest.builder()
                .withdrawalRequestId(UUID.randomUUID())
                .amount(new BigDecimal("100.00"))
                .toBankBin("970422")
                .bankAccount("0123456789")
                .build();

        assertThrows(AppException.class, () -> gateway.createPayout(request));
    }

    @Test
    void getBalance_ShouldThrowException_WhenTimeout() {
        when(payOS.payoutsAccount()).thenReturn(payoutsAccountService);
        when(payoutsAccountService.balance()).thenThrow(new vn.payos.exception.ConnectionTimeoutException("timeout"));

        assertThrows(AppException.class, () -> gateway.getBalance());
    }

    @Test
    void getBalance_ShouldThrowException_WhenPayOSException() {
        when(payOS.payoutsAccount()).thenReturn(payoutsAccountService);
        when(payoutsAccountService.balance()).thenThrow(new vn.payos.exception.PayOSException("PayOS sdk error"));

        assertThrows(AppException.class, () -> gateway.getBalance());
    }

    @Test
    void getBalance_ShouldThrowException_WhenGenericException() {
        when(payOS.payoutsAccount()).thenReturn(payoutsAccountService);
        when(payoutsAccountService.balance()).thenThrow(new RuntimeException("Generic error"));

        assertThrows(AppException.class, () -> gateway.getBalance());
    }

    @Test
    void getStatus_ShouldThrowException_WhenTimeout() {
        when(payOS.payouts()).thenReturn(payoutsService);
        when(payoutsService.get("po_123")).thenThrow(new vn.payos.exception.ConnectionTimeoutException("timeout"));

        assertThrows(AppException.class, () -> gateway.getStatus("po_123"));
    }

    @Test
    void getStatus_ShouldThrowException_WhenPayOSException() {
        when(payOS.payouts()).thenReturn(payoutsService);
        when(payoutsService.get("po_123")).thenThrow(new vn.payos.exception.PayOSException("PayOS sdk error"));

        assertThrows(AppException.class, () -> gateway.getStatus("po_123"));
    }

    @Test
    void getStatus_ShouldThrowException_WhenGenericException() {
        when(payOS.payouts()).thenReturn(payoutsService);
        when(payoutsService.get("po_123")).thenThrow(new RuntimeException("Generic error"));

        assertThrows(AppException.class, () -> gateway.getStatus("po_123"));
    }
}
