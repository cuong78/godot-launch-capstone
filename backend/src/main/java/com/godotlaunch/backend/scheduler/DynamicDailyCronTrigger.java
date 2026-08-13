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
 * timeSupplier mỗi lần Spring hỏi "lần chạy tiếp theo là khi nào".
 *
 * LƯU Ý QUAN TRỌNG (đã xác nhận qua test thực tế): Spring TaskScheduler chỉ
 * gọi nextExecution() NGAY SAU KHI lần chạy trước đó hoàn tất, KHÔNG polling
 * liên tục — nên tự bản thân trigger này KHÔNG đủ để "đổi giờ áp dụng ngay
 * lập tức". Việc áp dụng ngay (không cần restart app) do
 * DailyMaintenanceScheduler đảm nhiệm: nó chủ động hủy + gọi lại
 * taskScheduler.schedule(...) với 1 instance trigger MỚI mỗi khi nhận
 * PlatformSettingsUpdatedEvent — buộc Spring phải hỏi lại nextExecution()
 * ngay lập tức thay vì đợi tới lần chạy kế tiếp.
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
