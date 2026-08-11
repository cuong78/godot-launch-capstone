package com.godotlaunch.backend.scheduler;

import com.godotlaunch.backend.entity.Dispute;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.WithdrawalRequest;
import com.godotlaunch.backend.entity.enums.DisputeStatus;
import com.godotlaunch.backend.entity.enums.WithdrawalStatus;
import com.godotlaunch.backend.repository.DisputeRepository;
import com.godotlaunch.backend.repository.WithdrawalRequestRepository;
import com.godotlaunch.backend.service.PlatformSettingsService;
import com.godotlaunch.backend.service.WithdrawalRequestService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WithdrawalAutoPayoutSchedulerTest {

        @Mock
        private WithdrawalRequestRepository withdrawalRequestRepository;

        @Mock
        private DisputeRepository disputeRepository;

        @Mock
        private PlatformSettingsService platformSettingsService;

        @Mock
        private WithdrawalRequestService withdrawalRequestService;

        @InjectMocks
        private WithdrawalAutoPayoutScheduler scheduler;

        private User seller;
        private WithdrawalRequest withdrawal;

        @BeforeEach
        void setUp() {
                seller = new User();
                seller.setId(UUID.randomUUID());

                withdrawal = new WithdrawalRequest();
                withdrawal.setId(UUID.randomUUID());
                withdrawal.setUser(seller);
                withdrawal.setStatus(WithdrawalStatus.pending);
        }

        @Test
        void shouldNotCreatePayoutBeforeHoldPeriodEnds() {
                when(platformSettingsService.getWithdrawalHoldDays()).thenReturn((short) 3);
                when(withdrawalRequestRepository.findByStatusAndCreatedAtBeforeWithUser(eq(WithdrawalStatus.pending), any()))
                                .thenReturn(List.of());

                Instant beforeRun = Instant.now();
                scheduler.autoApproveEligibleWithdrawals();

                ArgumentCaptor<Instant> cutoffCaptor = ArgumentCaptor.forClass(Instant.class);
                verify(withdrawalRequestRepository).findByStatusAndCreatedAtBeforeWithUser(
                                eq(WithdrawalStatus.pending),
                                cutoffCaptor.capture());
                assertThat(cutoffCaptor.getValue()).isBetween(
                                beforeRun.minus(3, ChronoUnit.DAYS).minusSeconds(1),
                                Instant.now().minus(3, ChronoUnit.DAYS).plusSeconds(1));
                verify(withdrawalRequestService, never()).approveWithdrawal(any(), any(), any());
        }

        @Test
        void shouldCreateAutomaticPayoutForEligibleWithdrawal() {
                when(platformSettingsService.getWithdrawalHoldDays()).thenReturn((short) 3);
                when(withdrawalRequestRepository.findByStatusAndCreatedAtBeforeWithUser(eq(WithdrawalStatus.pending), any()))
                                .thenReturn(List.of(withdrawal));
                when(disputeRepository.existsByReportedSellerIdAndStatus(seller.getId(), DisputeStatus.open))
                                .thenReturn(false);
                when(withdrawalRequestService.approveWithdrawal(withdrawal.getId(), null, null))
                                .thenAnswer(invocation -> {
                                        withdrawal.setStatus(WithdrawalStatus.processing);
                                        return null;
                                });

                scheduler.autoApproveEligibleWithdrawals();

                assertThat(withdrawal.getStatus()).isEqualTo(WithdrawalStatus.processing);
                verify(withdrawalRequestService).approveWithdrawal(withdrawal.getId(), null, null);
        }

        @Test
        void shouldKeepEligibleWithdrawalPendingWhenSellerHasOpenDispute() {
                when(platformSettingsService.getWithdrawalHoldDays()).thenReturn((short) 3);
                when(withdrawalRequestRepository.findByStatusAndCreatedAtBeforeWithUser(eq(WithdrawalStatus.pending), any()))
                                .thenReturn(List.of(withdrawal));
                when(disputeRepository.existsByReportedSellerIdAndStatus(seller.getId(), DisputeStatus.open))
                                .thenReturn(true);

                scheduler.autoApproveEligibleWithdrawals();

                assertThat(withdrawal.getStatus()).isEqualTo(WithdrawalStatus.pending);
                verify(withdrawalRequestService, never()).approveWithdrawal(any(), any(), any());
        }

        @Test
        void shouldKeepEligibleWithdrawalPendingWhenSellerIsLockedForRefund() {
                Dispute blockingDispute = new Dispute();
                blockingDispute.setId(UUID.randomUUID());
                seller.setLockedForDispute(blockingDispute);
                when(platformSettingsService.getWithdrawalHoldDays()).thenReturn((short) 3);
                when(withdrawalRequestRepository.findByStatusAndCreatedAtBeforeWithUser(eq(WithdrawalStatus.pending), any()))
                                .thenReturn(List.of(withdrawal));
                when(disputeRepository.existsByReportedSellerIdAndStatus(seller.getId(), DisputeStatus.open))
                                .thenReturn(false);

                scheduler.autoApproveEligibleWithdrawals();

                assertThat(withdrawal.getStatus()).isEqualTo(WithdrawalStatus.pending);
                verify(withdrawalRequestService, never()).approveWithdrawal(any(), any(), any());
        }
}
