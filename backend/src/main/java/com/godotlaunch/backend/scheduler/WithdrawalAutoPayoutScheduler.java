package com.godotlaunch.backend.scheduler;

import com.godotlaunch.backend.entity.WithdrawalRequest;
import com.godotlaunch.backend.entity.enums.DisputeStatus;
import com.godotlaunch.backend.entity.enums.WithdrawalStatus;
import com.godotlaunch.backend.repository.DisputeRepository;
import com.godotlaunch.backend.repository.WithdrawalRequestRepository;
import com.godotlaunch.backend.service.PlatformSettingsService;
import com.godotlaunch.backend.service.WithdrawalRequestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

/**
 * Thay thế bước admin "Create Payout Order" thủ công: sau khi withdrawal ở
 * trạng thái pending đủ withdrawalHoldDays (cooling-off, admin config được),
 * tự động tạo payout order — trừ khi seller đang có dispute open nhắm vào,
 * trường hợp đó giữ vô thời hạn cho tới khi dispute được resolve.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WithdrawalAutoPayoutScheduler {

    private final WithdrawalRequestRepository withdrawalRequestRepository;
    private final DisputeRepository disputeRepository;
    private final PlatformSettingsService platformSettingsService;
    private final WithdrawalRequestService withdrawalRequestService;

    @Scheduled(fixedDelayString = "${app.withdrawal.auto-payout-interval-ms:1800000}")
    public void autoApproveEligibleWithdrawals() {
        short holdDays = platformSettingsService.getWithdrawalHoldDays();
        Instant cutoff = Instant.now().minus(holdDays, ChronoUnit.DAYS);

        List<WithdrawalRequest> eligible =
                withdrawalRequestRepository.findByStatusAndCreatedAtBefore(WithdrawalStatus.pending, cutoff);

        for (WithdrawalRequest withdrawal : eligible) {
            UUID sellerId = withdrawal.getUser().getId();
            boolean hasOpenDispute = disputeRepository
                    .existsByReportedSellerIdAndStatus(sellerId, DisputeStatus.open);

            if (hasOpenDispute) {
                log.info("Withdrawal {} held: seller {} has an open dispute", withdrawal.getId(), sellerId);
                continue;
            }

            try {
                withdrawalRequestService.approveWithdrawal(withdrawal.getId(), null, null);
                log.info("Auto-approved withdrawal {} after {}-day cooling-off period", withdrawal.getId(), holdDays);
            } catch (Exception e) {
                log.error("Auto payout failed for withdrawal {}: {}", withdrawal.getId(), e.getMessage(), e);
            }
        }
    }
}
