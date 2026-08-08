package com.godotlaunch.backend.scheduler;

import org.jspecify.annotations.Nullable;
import org.springframework.scheduling.Trigger;
import org.springframework.scheduling.TriggerContext;
import org.springframework.scheduling.support.CronTrigger;

import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.function.Supplier;

/**
 * Trigger chạy 1 lần/ngày tại giờ:phút:giây do admin cấu hình trong DB
 * (PlatformSettings.dailyMaintenanceTime), luôn tính theo giờ Việt Nam.
 *
 * Khác với @Scheduled(cron=...) cố định lúc khởi động, trigger này đọc lại
 * timeSupplier MỖI LẦN Spring hỏi "lần chạy tiếp theo là khi nào" — nên khi
 * admin đổi giờ qua DB, lần lên lịch kế tiếp sẽ tự phản ánh giá trị mới,
 * không cần restart app.
 */
public class DynamicDailyCronTrigger implements Trigger {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final Supplier<LocalTime> timeSupplier;

    public DynamicDailyCronTrigger(Supplier<LocalTime> timeSupplier) {
        this.timeSupplier = timeSupplier;
    }

    @Override
    public @Nullable Instant nextExecution(TriggerContext triggerContext) {
        LocalTime time = timeSupplier.get();
        String cronExpression = String.format(
                "%d %d %d * * *", time.getSecond(), time.getMinute(), time.getHour());
        return new CronTrigger(cronExpression, VIETNAM_ZONE).nextExecution(triggerContext);
    }
}
