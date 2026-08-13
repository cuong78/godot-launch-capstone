package com.godotlaunch.backend.scheduler;

import com.godotlaunch.backend.event.PlatformSettingsUpdatedEvent;
import com.godotlaunch.backend.service.PlatformSettingsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Component;

import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Đăng ký 2 job "canh mốc ngày" (WithdrawalAutoPayoutScheduler,
 * DisputeRefundEnforcementScheduler) chạy 1 lần/ngày tại giờ admin cấu hình
 * trong PlatformSettings.dailyMaintenanceTime.
 *
 * THAY THẾ SchedulingConfig (dùng ScheduledTaskRegistrar.addTriggerTask) vì
 * cách đó có 1 nhược điểm đã xác nhận qua test thực tế: Spring chỉ gọi lại
 * Trigger.nextExecution() SAU KHI job vừa chạy xong lần trước, KHÔNG phải
 * ngay khi giá trị DB đổi — nên admin sửa "Giờ chạy tác vụ hàng ngày" trên
 * UI xong, job vẫn chạy theo giờ CŨ cho tới lần chạy kế tiếp (thường là
 * ngày mai), phải restart backend mới áp dụng giờ mới ngay — không phù hợp
 * cho việc demo/test trong ngày.
 *
 * Ở đây tự quản lý ScheduledFuture bằng TaskScheduler trực tiếp (cùng
 * pattern WithdrawalPayoutSyncScheduler), và lắng nghe
 * PlatformSettingsUpdatedEvent để HỦY lịch cũ + ĐĂNG KÝ LẠI ngay lập tức mỗi
 * khi admin lưu cấu hình mới — không cần restart app nữa.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DailyMaintenanceScheduler {

    private final TaskScheduler taskScheduler;
    private final PlatformSettingsService platformSettingsService;
    private final WithdrawalAutoPayoutScheduler withdrawalAutoPayoutScheduler;
    private final DisputeRefundEnforcementScheduler disputeRefundEnforcementScheduler;

    private final AtomicReference<ScheduledFuture<?>> withdrawalTask = new AtomicReference<>();
    private final AtomicReference<ScheduledFuture<?>> disputeTask = new AtomicReference<>();

    @EventListener(ApplicationReadyEvent.class)
    void scheduleOnStartup() {
        reschedule();
    }

    @EventListener(PlatformSettingsUpdatedEvent.class)
    void onPlatformSettingsUpdated() {
        log.info("PlatformSettings changed — rescheduling daily maintenance jobs immediately.");
        reschedule();
    }

    /**
     * Hủy 2 job đang chờ (nếu có) và đăng ký lại với DynamicDailyCronTrigger
     * mới — trigger này tự đọc lại getDailyMaintenanceTime() ngay tại thời
     * điểm này nên luôn phản ánh giá trị DB mới nhất.
     */
    private synchronized void reschedule() {
        cancel(withdrawalTask);
        cancel(disputeTask);

        withdrawalTask.set(taskScheduler.schedule(
                withdrawalAutoPayoutScheduler::autoApproveEligibleWithdrawals,
                new DynamicDailyCronTrigger(platformSettingsService::getDailyMaintenanceTime)));

        disputeTask.set(taskScheduler.schedule(
                disputeRefundEnforcementScheduler::banOverdueUnrefundedSellers,
                new DynamicDailyCronTrigger(platformSettingsService::getDailyMaintenanceTime)));

        log.info("Daily maintenance jobs (re)scheduled for {}.", platformSettingsService.getDailyMaintenanceTime());
    }

    private void cancel(AtomicReference<ScheduledFuture<?>> ref) {
        ScheduledFuture<?> future = ref.getAndSet(null);
        if (future != null) {
            // cancel(false): không interrupt job đang chạy dở (nếu đúng lúc trùng
            // thời điểm reschedule), chỉ hủy lần chạy CHƯA xảy ra.
            future.cancel(false);
        }
    }
}
