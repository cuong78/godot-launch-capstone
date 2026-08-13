package com.godotlaunch.backend.event;

import org.springframework.context.ApplicationEvent;

/**
 * Bắn ra ngay sau khi admin lưu PlatformSettings thành công — dùng để các
 * component khác (vd DailyMaintenanceScheduler) tự phản ứng ngay lập tức
 * thay vì phải đợi tới lần chạy job kế tiếp mới "tình cờ" đọc lại DB.
 */
public class PlatformSettingsUpdatedEvent extends ApplicationEvent {
    public PlatformSettingsUpdatedEvent(Object source) {
        super(source);
    }
}
