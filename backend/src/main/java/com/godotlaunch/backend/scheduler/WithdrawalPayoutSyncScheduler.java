package com.godotlaunch.backend.scheduler;

import com.godotlaunch.backend.entity.WithdrawalRequest;
import com.godotlaunch.backend.entity.enums.WithdrawalStatus;
import com.godotlaunch.backend.repository.WithdrawalRequestRepository;
import com.godotlaunch.backend.service.WithdrawalStatusSynchronizer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class WithdrawalPayoutSyncScheduler {

    private final WithdrawalRequestRepository withdrawalRequestRepository;
    private final WithdrawalStatusSynchronizer withdrawalStatusSynchronizer;

    // fixedDelay: tính từ lúc lần chạy trước KẾT THÚC, tránh chạy chồng lên nhau nếu PayOS phản hồi chậm.
    @Scheduled(fixedDelayString = "${app.withdrawal.payout-sync-interval-ms:30000}")
    public void syncProcessingWithdrawals() {
        List<WithdrawalRequest> processingWithdrawals =
                withdrawalRequestRepository.findByStatusOrderByCreatedAtDesc(WithdrawalStatus.processing);

        for (WithdrawalRequest withdrawal : processingWithdrawals) {
            if (!StringUtils.hasText(withdrawal.getPayosPayoutId())) {
                continue;
            }
            try {
                withdrawalStatusSynchronizer.synchronize(withdrawal.getId(), null);
            } catch (Exception e) {
                log.error("Scheduled payout sync failed for withdrawal {}: {}", withdrawal.getId(), e.getMessage(), e);
            }
        }
    }
}
