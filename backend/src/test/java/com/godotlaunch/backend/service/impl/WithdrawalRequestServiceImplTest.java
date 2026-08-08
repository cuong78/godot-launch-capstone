package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.ApproveWithdrawalRequest;
import com.godotlaunch.backend.dto.request.CreateWithdrawalRequest;
import com.godotlaunch.backend.dto.response.PayoutGatewayBalanceResponse;
import com.godotlaunch.backend.dto.response.PayoutGatewayCreateResponse;
import com.godotlaunch.backend.dto.response.WithdrawalDetailResponse;
import com.godotlaunch.backend.entity.Role;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.Wallet;
import com.godotlaunch.backend.entity.WithdrawalRequest;
import com.godotlaunch.backend.entity.enums.WithdrawalStatus;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.DisputeRepository;
import com.godotlaunch.backend.repository.TransactionRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.repository.WalletRepository;
import com.godotlaunch.backend.repository.WithdrawalRequestRepository;
import com.godotlaunch.backend.repository.PayoutGateway;
import com.godotlaunch.backend.security.EncryptionUtils;
import com.godotlaunch.backend.service.AuditLogService;
import com.godotlaunch.backend.service.PlatformSettingsService;
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
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.mock;
import static org.assertj.core.api.Assertions.assertThat;
import org.springframework.test.util.ReflectionTestUtils;

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
    private EncryptionUtils encryptionUtils;

    @Mock
    private DisputeRepository disputeRepository;

    @Mock
    private WithdrawalStatusSynchronizer withdrawalStatusSynchronizer;

    @Mock
    private PlatformSettingsService platformSettingsService;

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
        developerUser.setBankName("MBBank");
        developerUser.setBankAccount("123456789");
        developerUser.setBankAccountHolder("Dev User");

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
        withdrawal.setTransferReference("GLWD-ORIGINAL");
        withdrawal.setStatus(WithdrawalStatus.pending);

        lenient().when(encryptionUtils.encrypt(any())).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(encryptionUtils.decrypt(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void approveWithdrawal_ShouldCreatePayoutAndMoveToProcessing_WithoutChangingWallet() {
        when(withdrawalRequestRepository.findByIdWithLock(withdrawal.getId())).thenReturn(Optional.of(withdrawal));
        when(walletRepository.findByUserId(developerUser.getId())).thenReturn(Optional.of(wallet));
        when(transactionRepository.sumAmountByWalletIdAndTypeIn(eq(wallet.getId()), anySet()))
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
    void approveWithdrawal_ShouldReconcileWithPayOS_WhenCreatePayoutFailsButPayoutAlreadyExists() {
        when(withdrawalRequestRepository.findByIdWithLock(withdrawal.getId())).thenReturn(Optional.of(withdrawal));
        when(walletRepository.findByUserId(developerUser.getId())).thenReturn(Optional.of(wallet));
        when(transactionRepository.sumAmountByWalletIdAndTypeIn(eq(wallet.getId()), anySet()))
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
        when(payoutGateway.createPayout(any()))
                .thenThrow(new AppException(ErrorCode.PAYOUT_CREATE_FAILED));
        when(payoutGateway.findPayoutByReferenceId(withdrawal.getId().toString())).thenReturn(
                Optional.of(PayoutGatewayCreateResponse.builder()
                        .payoutId("po_reconciled")
                        .referenceId(withdrawal.getId().toString())
                        .status("SUCCEEDED")
                        .providerReference("provider_ref_reconciled")
                        .createdAt("2026-06-28T22:00:00Z")
                        .build())
        );
        when(withdrawalRequestRepository.save(any(WithdrawalRequest.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        WithdrawalDetailResponse response = withdrawalRequestService.approveWithdrawal(
                withdrawal.getId(),
                new ApproveWithdrawalRequest("GLWD-APPROVED", null),
                adminUser.getEmail()
        );

        assertEquals(WithdrawalStatus.processing, response.getStatus());
        assertEquals("po_reconciled", response.getPayosPayoutId());
        verify(payoutGateway).findPayoutByReferenceId(withdrawal.getId().toString());
    }

    @Test
    void approveWithdrawal_ShouldRethrowOriginalError_WhenCreatePayoutFailsAndNoPayoutFound() {
        when(withdrawalRequestRepository.findByIdWithLock(withdrawal.getId())).thenReturn(Optional.of(withdrawal));
        when(payoutGateway.getBalance()).thenReturn(
                PayoutGatewayBalanceResponse.builder()
                        .accountNumber("9999999999")
                        .accountName("GodotLaunch")
                        .currency("VND")
                        .balance(new BigDecimal("999999999"))
                        .status("active")
                        .build()
        );
        when(payoutGateway.createPayout(any()))
                .thenThrow(new AppException(ErrorCode.PAYOUT_CREATE_FAILED));
        when(payoutGateway.findPayoutByReferenceId(withdrawal.getId().toString()))
                .thenReturn(Optional.empty());

        AppException exception = assertThrows(
                AppException.class,
                () -> withdrawalRequestService.approveWithdrawal(
                        withdrawal.getId(),
                        new ApproveWithdrawalRequest("GLWD-FAIL", null),
                        adminUser.getEmail()
                )
        );

        assertEquals(ErrorCode.PAYOUT_CREATE_FAILED, exception.getErrorCode());
        assertEquals(WithdrawalStatus.pending, withdrawal.getStatus());
        verify(withdrawalRequestRepository, never()).save(any(WithdrawalRequest.class));
    }

    @Test
    void getDeveloperWalletSummary_ShouldRejectAdminSelfServiceAccess() {
        when(userRepository.findByEmail(adminUser.getEmail())).thenReturn(Optional.of(adminUser));

        AppException exception = assertThrows(
                AppException.class,
                () -> withdrawalRequestService.getDeveloperWalletSummary(adminUser.getEmail())
        );

        assertEquals(ErrorCode.ACCESS_DENIED, exception.getErrorCode());
        verify(walletRepository, never()).findByUserId(adminUser.getId());
    }

    @Test
    void createDeveloperWithdrawal_ShouldRejectAdminSelfServiceAccess() {
        when(userRepository.findByEmail(adminUser.getEmail())).thenReturn(Optional.of(adminUser));

        AppException exception = assertThrows(
                AppException.class,
                () -> withdrawalRequestService.createDeveloperWithdrawal(
                        new CreateWithdrawalRequest(
                                new BigDecimal("100000"),
                                "MB Bank",
                                "0123456789",
                                "Admin User",
                                null
                        ),
                        adminUser.getEmail()
                )
        );

        assertEquals(ErrorCode.ACCESS_DENIED, exception.getErrorCode());
        verify(withdrawalRequestRepository, never()).save(any(WithdrawalRequest.class));
    }

    @Test
    void getDeveloperSalesStats_ShouldReturnStats_WhenDeveloper() {
        when(userRepository.findByEmail(developerUser.getEmail())).thenReturn(Optional.of(developerUser));
        when(walletRepository.findByUserId(developerUser.getId())).thenReturn(Optional.of(wallet));
        when(transactionRepository.countByWalletIdAndType(wallet.getId(), com.godotlaunch.backend.entity.enums.TxnType.revenue_share)).thenReturn(10L);
        when(transactionRepository.sumAmountByWalletIdAndTypeIn(eq(wallet.getId()), anySet())).thenReturn(new BigDecimal("1000.00"));

        com.godotlaunch.backend.dto.response.DeveloperSalesStatsResponse response = withdrawalRequestService.getDeveloperSalesStats(developerUser.getEmail());

        assertEquals(developerUser.getId(), response.getDeveloperId());
        assertEquals(10L, response.getTotalUnitsSold());
        assertEquals(new BigDecimal("1000.00"), response.getTotalRevenue());
    }

    @Test
    void getDeveloperWithdrawalDetail_ShouldReturnDetail_WhenOwner() {
        when(userRepository.findByEmail(developerUser.getEmail())).thenReturn(Optional.of(developerUser));
        when(withdrawalRequestRepository.findById(withdrawal.getId())).thenReturn(Optional.of(withdrawal));
        when(walletRepository.findByUserId(developerUser.getId())).thenReturn(Optional.of(wallet));
        when(transactionRepository.sumAmountByWalletIdAndTypeIn(eq(wallet.getId()), anySet())).thenReturn(new BigDecimal("250000"));
        when(withdrawalRequestRepository.sumAmountByUserIdAndStatusIn(eq(developerUser.getId()), anySet())).thenReturn(new BigDecimal("100000"));

        WithdrawalDetailResponse response = withdrawalRequestService.getDeveloperWithdrawalDetail(withdrawal.getId(), developerUser.getEmail());

        assertEquals(withdrawal.getId(), response.getId());
        assertEquals(WithdrawalStatus.pending, response.getStatus());
    }

    @Test
    void getDeveloperWithdrawalDetail_ShouldThrowException_WhenNotOwner() {
        when(userRepository.findByEmail(otherDeveloper().getEmail())).thenReturn(Optional.of(otherDeveloper()));
        when(withdrawalRequestRepository.findById(withdrawal.getId())).thenReturn(Optional.of(withdrawal));

        assertThrows(AppException.class, () ->
                withdrawalRequestService.getDeveloperWithdrawalDetail(withdrawal.getId(), otherDeveloper().getEmail())
        );
    }

    private User otherDeveloper() {
        User dev = new User();
        dev.setId(UUID.randomUUID());
        dev.setEmail("otherdev@example.com");
        Role role = new Role();
        role.setName("developer");
        dev.setRole(role);
        return dev;
    }

    @Test
    void rejectWithdrawal_ShouldSetRejectedAndLogAudit_WhenPending() {
        when(userRepository.findByEmail(adminUser.getEmail())).thenReturn(Optional.of(adminUser));
        when(withdrawalRequestRepository.findByIdWithLock(withdrawal.getId())).thenReturn(Optional.of(withdrawal));
        when(walletRepository.findByUserId(developerUser.getId())).thenReturn(Optional.of(wallet));
        when(withdrawalRequestRepository.save(any(WithdrawalRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        WithdrawalDetailResponse response = withdrawalRequestService.rejectWithdrawal(
                withdrawal.getId(),
                new com.godotlaunch.backend.dto.request.RejectWithdrawalRequest("Not eligible"),
                adminUser.getEmail()
        );

        assertEquals(WithdrawalStatus.rejected, response.getStatus());
        verify(auditLogService).publishAuto(
                eq(com.godotlaunch.backend.entity.enums.AuditAction.withdrawal_rejected),
                eq(com.godotlaunch.backend.entity.enums.AuditTarget.withdrawal_request),
                eq(withdrawal.getId()),
                any(),
                any(),
                anyString()
        );
    }

    @Test
    void rejectWithdrawal_ShouldThrowException_WhenNotPending() {
        withdrawal.setStatus(WithdrawalStatus.approved);
        when(userRepository.findByEmail(adminUser.getEmail())).thenReturn(Optional.of(adminUser));
        when(withdrawalRequestRepository.findByIdWithLock(withdrawal.getId())).thenReturn(Optional.of(withdrawal));

        assertThrows(AppException.class, () ->
                withdrawalRequestService.rejectWithdrawal(
                        withdrawal.getId(),
                        new com.godotlaunch.backend.dto.request.RejectWithdrawalRequest("Reason"),
                        adminUser.getEmail()
                )
        );
    }

    @Test
    void createDeveloperWithdrawal_ShouldSucceed_WhenValid() {
        when(userRepository.findByEmail(developerUser.getEmail())).thenReturn(Optional.of(developerUser));
        when(walletRepository.findByUserIdWithLock(developerUser.getId())).thenReturn(Optional.of(wallet));
        when(transactionRepository.sumAmountByWalletIdAndTypeIn(eq(wallet.getId()), anySet())).thenReturn(new BigDecimal("250000"));
        when(withdrawalRequestRepository.sumAmountByUserIdAndStatusIn(eq(developerUser.getId()), anySet())).thenReturn(new BigDecimal("100000"));
        when(withdrawalRequestRepository.save(any(WithdrawalRequest.class))).thenAnswer(inv -> {
            WithdrawalRequest w = inv.getArgument(0);
            if (w.getId() == null) {
                w.setId(UUID.randomUUID());
            }
            return w;
        });

        CreateWithdrawalRequest request = new CreateWithdrawalRequest(
                new BigDecimal("50000"),
                "MB Bank",
                "0123456789",
                "Dev User",
                "remark note"
        );

        WithdrawalDetailResponse response = withdrawalRequestService.createDeveloperWithdrawal(request, developerUser.getEmail());

        assertEquals(WithdrawalStatus.pending, response.getStatus());
        assertEquals(new BigDecimal("50000"), response.getAmount());
    }

    @Test
    void createDeveloperWithdrawal_ShouldThrowException_WhenInsufficientBalance() {
        when(userRepository.findByEmail(developerUser.getEmail())).thenReturn(Optional.of(developerUser));
        when(walletRepository.findByUserIdWithLock(developerUser.getId())).thenReturn(Optional.of(wallet));
        when(transactionRepository.sumAmountByWalletIdAndTypeIn(eq(wallet.getId()), anySet())).thenReturn(new BigDecimal("150000"));
        when(withdrawalRequestRepository.sumAmountByUserIdAndStatusIn(eq(developerUser.getId()), anySet())).thenReturn(new BigDecimal("100000"));

        CreateWithdrawalRequest request = new CreateWithdrawalRequest(
                new BigDecimal("200000"),
                "MB Bank",
                "0123456789",
                "Dev User",
                "remark note"
        );

        assertThrows(AppException.class, () ->
                withdrawalRequestService.createDeveloperWithdrawal(request, developerUser.getEmail())
        );
    }

    @Test
    void getDeveloperWithdrawals_ShouldReturnList() {
        when(userRepository.findByEmail(developerUser.getEmail())).thenReturn(Optional.of(developerUser));
        when(withdrawalRequestRepository.findByUserIdOrderByCreatedAtDesc(developerUser.getId()))
                .thenReturn(java.util.List.of(withdrawal));

        java.util.List<com.godotlaunch.backend.dto.response.WithdrawalResponse> list = 
                withdrawalRequestService.getDeveloperWithdrawals(developerUser.getEmail());

        assertThat(list).hasSize(1);
        assertThat(list.get(0).getId()).isEqualTo(withdrawal.getId());
    }

    @Test
    void getAdminWithdrawals_ShouldReturnList() {
        when(withdrawalRequestRepository.findAllByOrderByCreatedAtDesc())
                .thenReturn(java.util.List.of(withdrawal));

        java.util.List<com.godotlaunch.backend.dto.response.WithdrawalResponse> list = 
                withdrawalRequestService.getAdminWithdrawals();

        assertThat(list).hasSize(1);
        assertThat(list.get(0).getId()).isEqualTo(withdrawal.getId());
    }

    @Test
    void getAdminWithdrawalDetail_ShouldReturnDetail() {
        when(withdrawalRequestRepository.findById(withdrawal.getId())).thenReturn(Optional.of(withdrawal));
        when(walletRepository.findByUserId(developerUser.getId())).thenReturn(Optional.of(wallet));
        when(transactionRepository.sumAmountByWalletIdAndTypeIn(eq(wallet.getId()), anySet())).thenReturn(new BigDecimal("250000"));
        when(withdrawalRequestRepository.sumAmountByUserIdAndStatusIn(eq(developerUser.getId()), anySet())).thenReturn(new BigDecimal("100000"));

        WithdrawalDetailResponse response = withdrawalRequestService.getAdminWithdrawalDetail(withdrawal.getId());

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(withdrawal.getId());
    }

    @Test
    void rejectWithdrawal_ShouldThrowException_WhenRemarkEmpty() {
        when(userRepository.findByEmail(adminUser.getEmail())).thenReturn(Optional.of(adminUser));
        when(withdrawalRequestRepository.findByIdWithLock(withdrawal.getId())).thenReturn(Optional.of(withdrawal));

        assertThrows(AppException.class, () ->
                withdrawalRequestService.rejectWithdrawal(withdrawal.getId(), new com.godotlaunch.backend.dto.request.RejectWithdrawalRequest(""), adminUser.getEmail())
        );
    }

    @Test
    void syncWithdrawalStatus_ShouldSucceed() {
        com.godotlaunch.backend.service.WithdrawalStatusSynchronizer sync = mock(com.godotlaunch.backend.service.WithdrawalStatusSynchronizer.class);
        ReflectionTestUtils.setField(withdrawalRequestService, "withdrawalStatusSynchronizer", sync);

        when(sync.synchronize(withdrawal.getId(), adminUser.getEmail())).thenReturn(withdrawal);
        when(walletRepository.findByUserId(developerUser.getId())).thenReturn(Optional.of(wallet));
        when(transactionRepository.sumAmountByWalletIdAndTypeIn(eq(wallet.getId()), anySet())).thenReturn(new BigDecimal("250000"));
        when(withdrawalRequestRepository.sumAmountByUserIdAndStatusIn(eq(developerUser.getId()), anySet())).thenReturn(new BigDecimal("100000"));

        WithdrawalDetailResponse response = withdrawalRequestService.syncWithdrawalStatus(withdrawal.getId(), adminUser.getEmail());

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(withdrawal.getId());
    }
}
