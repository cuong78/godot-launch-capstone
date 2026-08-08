package com.godotlaunch.backend.config;

import com.godotlaunch.backend.scheduler.DisputeRefundEnforcementScheduler;
import com.godotlaunch.backend.scheduler.DynamicDailyCronTrigger;
import com.godotlaunch.backend.scheduler.WithdrawalAutoPayoutScheduler;
import com.godotlaunch.backend.service.PlatformSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;

/**
 * Đăng ký 2 job "canh mốc ngày" (WithdrawalAutoPayoutScheduler,
 * DisputeRefundEnforcementScheduler) chạy 1 lần/ngày tại giờ admin cấu hình
 * trong PlatformSettings.dailyMaintenanceTime — thay cho @Scheduled cố định,
 * vì DynamicDailyCronTrigger đọc lại DB mỗi lần lên lịch nên đổi giờ không
 * cần restart app. Mỗi job dùng 1 instance trigger riêng (cùng đọc chung 1
 * giá trị DB) để lỗi ở job này không ảnh hưởng lịch job kia.
 */
@Configuration
@RequiredArgsConstructor
public class SchedulingConfig implements SchedulingConfigurer {

    private final PlatformSettingsService platformSettingsService;
    private final WithdrawalAutoPayoutScheduler withdrawalAutoPayoutScheduler;
    private final DisputeRefundEnforcementScheduler disputeRefundEnforcementScheduler;

    @Override
    public void configureTasks(ScheduledTaskRegistrar taskRegistrar) {
        taskRegistrar.addTriggerTask(
                withdrawalAutoPayoutScheduler::autoApproveEligibleWithdrawals,
                new DynamicDailyCronTrigger(platformSettingsService::getDailyMaintenanceTime));

        taskRegistrar.addTriggerTask(
                disputeRefundEnforcementScheduler::banOverdueUnrefundedSellers,
                new DynamicDailyCronTrigger(platformSettingsService::getDailyMaintenanceTime));
    }
}
