package com.godotlaunch.backend.scheduler;

import com.godotlaunch.backend.entity.WithdrawalRequest;
import com.godotlaunch.backend.entity.enums.WithdrawalStatus;
import com.godotlaunch.backend.repository.WithdrawalRequestRepository;
import com.godotlaunch.backend.service.WithdrawalStatusSynchronizer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Poll PayOS mỗi 30s để cập nhật kết quả các withdrawal đang "processing"
 * (processing -> completed/failed). Trước đây chạy vô điều kiện 24/7 qua
 * @Scheduled cố định — giờ tự "thức dậy" khi có processing mới (gọi
 * ensureRunning() từ WithdrawalRequestServiceImpl.approveWithdrawal(), nơi
 * DUY NHẤT tạo processing mới) và tự "ngủ" ngay khi không còn withdrawal
 * nào đang processing, tránh query DB rỗng lặp lại suốt ngày.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WithdrawalPayoutSyncScheduler {

    private static final long SYNC_INTERVAL_MS = 30_000;

    private final WithdrawalRequestRepository withdrawalRequestRepository;
    private final WithdrawalStatusSynchronizer withdrawalStatusSynchronizer;
    private final TaskScheduler taskScheduler;

    private final AtomicReference<ScheduledFuture<?>> activeTask = new AtomicReference<>();

    /**
     * Bắt đầu polling nếu chưa chạy. An toàn để gọi nhiều lần liên tiếp
     * (idempotent) — không tạo thêm vòng lặp trùng nếu đã có 1 cái đang chạy.
     */
    public synchronized void ensureRunning() {
        if (activeTask.get() != null) {
            return;
        }
        log.info("Starting payout sync polling (processing withdrawal detected)");
        ScheduledFuture<?> future = taskScheduler.scheduleWithFixedDelay(
                this::tick, Duration.ofMillis(SYNC_INTERVAL_MS));
        activeTask.set(future);
    }

    private void tick() {
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

        if (processingWithdrawals.isEmpty()) {
            stopIfRunning();
        }
    }

    private synchronized void stopIfRunning() {
        ScheduledFuture<?> future = activeTask.getAndSet(null);
        if (future != null) {
            // cancel(false): không interrupt lần tick vừa chạy xong, chỉ ngăn lần kế tiếp.
            future.cancel(false);
            log.info("Stopped payout sync polling (no processing withdrawals left)");
        }
    }

    /**
     * Crash-recovery: nếu app khởi động lại giữa lúc còn withdrawal dở dang
     * ở trạng thái "processing" (payout đã tạo nhưng chưa có ai gọi
     * ensureRunning() lại), tự resume polling thay vì để kẹt vô thời hạn.
     */
    @EventListener(ApplicationReadyEvent.class)
    void resumeOnStartupIfNeeded() {
        boolean hasProcessing = !withdrawalRequestRepository
                .findByStatusOrderByCreatedAtDesc(WithdrawalStatus.processing).isEmpty();
        if (hasProcessing) {
            log.info("Found processing withdrawals on startup, resuming payout sync polling");
            ensureRunning();
        }
    }
}
