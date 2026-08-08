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
 *
 * Không dùng @Scheduled cố định — được SchedulingConfig đăng ký chạy 1
 * lần/ngày tại giờ admin cấu hình (DynamicDailyCronTrigger, giờ VN), đọc lại
 * DB mỗi lần lên lịch nên đổi giờ không cần restart app.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WithdrawalAutoPayoutScheduler {

    private final WithdrawalRequestRepository withdrawalRequestRepository;
    private final DisputeRepository disputeRepository;
    private final PlatformSettingsService platformSettingsService;
    private final WithdrawalRequestService withdrawalRequestService;

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

            if (withdrawal.getUser().getLockedForDispute() != null) {
                // Seller đang bị khóa role chờ hoàn tiền TH3 (post-payout dispute) —
                // giữ toàn bộ withdrawal khác của họ, không chỉ khoản liên quan dispute.
                log.info("Withdrawal {} held: seller {} is locked pending refund confirmation",
                        withdrawal.getId(), sellerId);
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
