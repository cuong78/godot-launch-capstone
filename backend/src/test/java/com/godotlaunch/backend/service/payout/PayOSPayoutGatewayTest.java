package com.godotlaunch.backend.service.payout;

import com.godotlaunch.backend.constant.ErrorCode;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

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
}
