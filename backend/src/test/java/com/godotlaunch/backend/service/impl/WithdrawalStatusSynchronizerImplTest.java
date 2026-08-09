package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.dto.response.PayoutGatewayStatusResponse;
import com.godotlaunch.backend.entity.Role;
import com.godotlaunch.backend.entity.Transaction;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.Wallet;
import com.godotlaunch.backend.entity.WithdrawalRequest;
import com.godotlaunch.backend.entity.enums.TxnType;
import com.godotlaunch.backend.entity.enums.WithdrawalStatus;
import com.godotlaunch.backend.repository.TransactionRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.repository.WalletRepository;
import com.godotlaunch.backend.repository.WithdrawalRequestRepository;
import com.godotlaunch.backend.repository.PayoutGateway;
import com.godotlaunch.backend.service.AuditLogService;
import com.godotlaunch.backend.service.WithdrawalStatusSynchronizer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WithdrawalStatusSynchronizerImplTest {

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

    @InjectMocks
    private WithdrawalStatusSynchronizerImpl synchronizer;

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
        wallet.setWithdrawableBalance(new BigDecimal("250000"));

        withdrawal = new WithdrawalRequest();
        withdrawal.setId(UUID.randomUUID());
        withdrawal.setUser(developerUser);
        withdrawal.setWallet(wallet);
        withdrawal.setAmount(new BigDecimal("100000"));
        withdrawal.setCurrency("VND");
        withdrawal.setTransferReference("GLWD-ORIGINAL");
        withdrawal.setPayosPayoutId("po_123");
        withdrawal.setPayosReferenceId(withdrawal.getId().toString());
        withdrawal.setStatus(WithdrawalStatus.processing);
    }

    @Test
    void synchronize_ShouldKeepProcessing_WhenPayOSStillProcessing() {
        when(userRepository.findByEmail(adminUser.getEmail())).thenReturn(Optional.of(adminUser));
        when(withdrawalRequestRepository.findByIdWithLock(withdrawal.getId())).thenReturn(Optional.of(withdrawal));
        when(payoutGateway.getStatus("po_123")).thenReturn(
                PayoutGatewayStatusResponse.builder()
                        .payoutId("po_123")
                        .transferReference(withdrawal.getId().toString())
                        .status("PROCESSING")
                        .providerReference("provider_ref")
                        .processedAt("2026-06-28T10:10:00Z")
                        .build()
        );
        when(withdrawalRequestRepository.save(any(WithdrawalRequest.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        WithdrawalRequest result = synchronizer.synchronize(withdrawal.getId(), adminUser.getEmail());

        assertEquals(WithdrawalStatus.processing, result.getStatus());
        verify(walletRepository, never()).save(any(Wallet.class));
        verify(transactionRepository, never()).save(any(Transaction.class));
    }

    @Test
    void synchronize_ShouldMarkFailed_WhenPayOSReturnsFailed() {
        when(userRepository.findByEmail(adminUser.getEmail())).thenReturn(Optional.of(adminUser));
        when(withdrawalRequestRepository.findByIdWithLock(withdrawal.getId())).thenReturn(Optional.of(withdrawal));
        when(payoutGateway.getStatus("po_123")).thenReturn(
                PayoutGatewayStatusResponse.builder()
                        .payoutId("po_123")
                        .transferReference(withdrawal.getId().toString())
                        .status("FAILED")
                        .providerReference("provider_ref")
                        .processedAt("2026-06-28T10:15:00Z")
                        .failureReason("Bank rejected the payout")
                        .build()
        );
        when(withdrawalRequestRepository.save(any(WithdrawalRequest.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        WithdrawalRequest result = synchronizer.synchronize(withdrawal.getId(), adminUser.getEmail());

        assertEquals(WithdrawalStatus.failed, result.getStatus());
        assertEquals("FAILED", result.getPayosStatus());
        verify(walletRepository, never()).save(any(Wallet.class));
        verify(transactionRepository, never()).save(any(Transaction.class));
    }

    @Test
    void synchronize_ShouldCompleteAndDeductWallet_WhenPayOSReturnsSucceeded() {
        when(userRepository.findByEmail(adminUser.getEmail())).thenReturn(Optional.of(adminUser));
        when(withdrawalRequestRepository.findByIdWithLock(withdrawal.getId())).thenReturn(Optional.of(withdrawal));
        when(walletRepository.findByUserIdWithLock(developerUser.getId())).thenReturn(Optional.of(wallet));
        when(payoutGateway.getStatus("po_123")).thenReturn(
                PayoutGatewayStatusResponse.builder()
                        .payoutId("po_123")
                        .transferReference(withdrawal.getId().toString())
                        .status("SUCCEEDED")
                        .providerReference("provider_ref_success")
                        .processedAt("2026-06-28T10:20:00Z")
                        .build()
        );
        when(walletRepository.save(any(Wallet.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(withdrawalRequestRepository.save(any(WithdrawalRequest.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        WithdrawalRequest result = synchronizer.synchronize(withdrawal.getId(), adminUser.getEmail());

        ArgumentCaptor<Transaction> transactionCaptor = ArgumentCaptor.forClass(Transaction.class);
        verify(transactionRepository).save(transactionCaptor.capture());
        Transaction savedTransaction = transactionCaptor.getValue();

        assertEquals(WithdrawalStatus.completed, result.getStatus());
        assertEquals(new BigDecimal("150000"), wallet.getBalance());
        assertEquals(new BigDecimal("150000"), wallet.getWithdrawableBalance());
        assertEquals(TxnType.withdrawal, savedTransaction.getType());
        assertEquals(new BigDecimal("-100000"), savedTransaction.getAmount());
        assertEquals("Withdrawal via PayOS", savedTransaction.getDescription());
        assertEquals(withdrawal.getId().toString(), savedTransaction.getReferenceId());
    }

    @Test
    void synchronize_ShouldBeIdempotent_WhenWithdrawalAlreadyCompleted() {
        withdrawal.setStatus(WithdrawalStatus.completed);
        withdrawal.setTransaction(new Transaction());
        when(userRepository.findByEmail(adminUser.getEmail())).thenReturn(Optional.of(adminUser));
        when(withdrawalRequestRepository.findByIdWithLock(withdrawal.getId())).thenReturn(Optional.of(withdrawal));

        WithdrawalRequest result = synchronizer.synchronize(withdrawal.getId(), adminUser.getEmail());

        assertEquals(WithdrawalStatus.completed, result.getStatus());
        verify(payoutGateway, never()).getStatus(any());
        verify(walletRepository, never()).save(any(Wallet.class));
        verify(transactionRepository, never()).save(any(Transaction.class));
    }
}
