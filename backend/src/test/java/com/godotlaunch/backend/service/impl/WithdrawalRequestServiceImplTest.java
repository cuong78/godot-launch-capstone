package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.ApproveWithdrawalRequest;
import com.godotlaunch.backend.dto.response.WithdrawalDetailResponse;
import com.godotlaunch.backend.entity.Role;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.Wallet;
import com.godotlaunch.backend.entity.WithdrawalRequest;
import com.godotlaunch.backend.entity.enums.TxnStatus;
import com.godotlaunch.backend.entity.enums.WithdrawalStatus;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.TransactionRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.repository.WalletRepository;
import com.godotlaunch.backend.repository.WithdrawalRequestRepository;
import com.godotlaunch.backend.service.AuditLogService;
import com.godotlaunch.backend.service.WithdrawalStatusSynchronizer;
import com.godotlaunch.backend.service.payout.PayoutGateway;
import com.godotlaunch.backend.service.payout.PayoutGatewayBalanceResponse;
import com.godotlaunch.backend.service.payout.PayoutGatewayCreateResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WithdrawalRequestServiceImplTest {

    @Mock
    private WithdrawalRequestRepository withdrawalRequestRepository;

    @Mock
    private WalletRepository walletRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private PayoutGateway payoutGateway;

    @Mock
    private WithdrawalStatusSynchronizer withdrawalStatusSynchronizer;

    @InjectMocks
    private WithdrawalRequestServiceImpl withdrawalRequestService;

    private User adminUser;
    private User developerUser;
    private Wallet wallet;
    private WithdrawalRequest withdrawal;

    @BeforeEach
    void setUp() {
        Role adminRole = new Role();
        adminRole.setId(UUID.randomUUID());
        adminRole.setName("admin");

        Role developerRole = new Role();
        developerRole.setId(UUID.randomUUID());
        developerRole.setName("developer");

        adminUser = new User();
        adminUser.setId(UUID.randomUUID());
        adminUser.setRole(adminRole);
        adminUser.setEmail("admin@godotlaunch.dev");
        adminUser.setFullName("Admin User");
        adminUser.setPasswordHash("hash");
        adminUser.setStatus("active");

        developerUser = new User();
        developerUser.setId(UUID.randomUUID());
        developerUser.setRole(developerRole);
        developerUser.setEmail("dev@godotlaunch.dev");
        developerUser.setFullName("Dev User");
        developerUser.setPasswordHash("hash");
        developerUser.setStatus("active");

        wallet = new Wallet();
        wallet.setId(UUID.randomUUID());
        wallet.setUser(developerUser);
        wallet.setCurrency("VND");
        wallet.setBalance(new BigDecimal("250000"));

        withdrawal = new WithdrawalRequest();
        withdrawal.setId(UUID.randomUUID());
        withdrawal.setUser(developerUser);
        withdrawal.setWallet(wallet);
        withdrawal.setAmount(new BigDecimal("100000"));
        withdrawal.setCurrency("VND");
        withdrawal.setBankName("MB Bank");
        withdrawal.setBankAccount("0123456789");
        withdrawal.setAccountHolder("Dev User");
        withdrawal.setTransferReference("GLWD-ORIGINAL");
        withdrawal.setStatus(WithdrawalStatus.pending);
    }

    @Test
    void approveWithdrawal_ShouldCreatePayoutAndMoveToProcessing_WithoutChangingWallet() {
        when(userRepository.findByEmail(adminUser.getEmail())).thenReturn(Optional.of(adminUser));
        when(withdrawalRequestRepository.findByIdWithLock(withdrawal.getId())).thenReturn(Optional.of(withdrawal));
        when(walletRepository.findByUserId(developerUser.getId())).thenReturn(Optional.of(wallet));
        when(transactionRepository.sumNetAmountByWalletIdAndTypeInAndStatus(eq(wallet.getId()), anySet(), eq(TxnStatus.completed)))
                .thenReturn(new BigDecimal("250000"));
        when(withdrawalRequestRepository.sumAmountByUserIdAndStatusIn(eq(developerUser.getId()), anySet()))
                .thenReturn(new BigDecimal("100000"));
        when(payoutGateway.getBalance()).thenReturn(
                PayoutGatewayBalanceResponse.builder()
                        .accountNumber("9999999999")
                        .accountName("GodotLaunch")
                        .currency("VND")
                        .balance(new BigDecimal("999999999"))
                        .status("active")
                        .build()
        );
        when(payoutGateway.createPayout(any())).thenReturn(
                PayoutGatewayCreateResponse.builder()
                        .payoutId("po_123")
                        .referenceId(withdrawal.getId().toString())
                        .status("SUBMITTED")
                        .providerReference("provider_ref_123")
                        .createdAt("2026-06-28T22:00:00Z")
                        .build()
        );
        when(withdrawalRequestRepository.save(any(WithdrawalRequest.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        WithdrawalDetailResponse response = withdrawalRequestService.approveWithdrawal(
                withdrawal.getId(),
                new ApproveWithdrawalRequest("GLWD-APPROVED", "Admin phase 3 approve"),
                adminUser.getEmail()
        );

        ArgumentCaptor<WithdrawalRequest> captor = ArgumentCaptor.forClass(WithdrawalRequest.class);
        verify(withdrawalRequestRepository).save(captor.capture());
        WithdrawalRequest saved = captor.getValue();

        assertEquals(WithdrawalStatus.processing, saved.getStatus());
        assertEquals("po_123", saved.getPayosPayoutId());
        assertEquals(withdrawal.getId().toString(), saved.getPayosReferenceId());
        assertEquals("SUBMITTED", saved.getPayosStatus());
        assertEquals("2026-06-28T22:00:00Z", saved.getPayosCreatedAt());

        assertEquals(WithdrawalStatus.processing, response.getStatus());
        assertEquals("po_123", response.getPayosPayoutId());
        assertEquals("SUBMITTED", response.getPayosStatus());

        verify(payoutGateway).getBalance();
        verify(payoutGateway).createPayout(any());
        verify(walletRepository, never()).save(any(Wallet.class));
        verify(walletRepository, never()).saveAndFlush(any(Wallet.class));
        assertEquals(new BigDecimal("250000"), wallet.getBalance());
    }

    @Test
    void approveWithdrawal_ShouldRejectWhenPayoutBalanceIsInsufficient() {
        when(userRepository.findByEmail(adminUser.getEmail())).thenReturn(Optional.of(adminUser));
        when(withdrawalRequestRepository.findByIdWithLock(withdrawal.getId())).thenReturn(Optional.of(withdrawal));
        when(payoutGateway.getBalance()).thenReturn(
                PayoutGatewayBalanceResponse.builder()
                        .accountNumber("9999999999")
                        .accountName("GodotLaunch")
                        .currency("VND")
                        .balance(new BigDecimal("50000"))
                        .status("active")
                        .build()
        );

        AppException exception = assertThrows(
                AppException.class,
                () -> withdrawalRequestService.approveWithdrawal(
                        withdrawal.getId(),
                        new ApproveWithdrawalRequest("GLWD-LOW", null),
                        adminUser.getEmail()
                )
        );

        assertEquals(ErrorCode.INSUFFICIENT_PAYOUT_BALANCE, exception.getErrorCode());
        assertTrue(withdrawal.getStatus() == WithdrawalStatus.pending);
        verify(payoutGateway).getBalance();
        verify(payoutGateway, never()).createPayout(any());
        verify(withdrawalRequestRepository, never()).save(any(WithdrawalRequest.class));
    }

    @Test
    void completeWithdrawal_ShouldDelegateToSynchronizer() {
        withdrawal.setStatus(WithdrawalStatus.completed);
        when(withdrawalStatusSynchronizer.synchronize(withdrawal.getId(), adminUser.getEmail())).thenReturn(withdrawal);
        when(walletRepository.findByUserId(developerUser.getId())).thenReturn(Optional.of(wallet));
        when(transactionRepository.sumNetAmountByWalletIdAndTypeInAndStatus(eq(wallet.getId()), anySet(), eq(TxnStatus.completed)))
                .thenReturn(new BigDecimal("250000"));
        when(withdrawalRequestRepository.sumAmountByUserIdAndStatusIn(eq(developerUser.getId()), anySet()))
                .thenReturn(BigDecimal.ZERO);

        WithdrawalDetailResponse response = withdrawalRequestService.completeWithdrawal(
                withdrawal.getId(),
                null,
                adminUser.getEmail()
        );

        assertEquals(WithdrawalStatus.completed, response.getStatus());
        verify(withdrawalStatusSynchronizer).synchronize(withdrawal.getId(), adminUser.getEmail());
    }
}
