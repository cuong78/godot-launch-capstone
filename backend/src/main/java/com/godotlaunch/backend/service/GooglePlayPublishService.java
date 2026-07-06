package com.godotlaunch.backend.service;

import com.godotlaunch.backend.entity.ExternalPublish;
import com.godotlaunch.backend.entity.GameVersion;

/**
 * Đẩy 1 GameVersion (build APK/AAB admin đã upload) lên Google Play Developer API.
 * Có 2 impl: mock (dev, không gọi API thật) và real (androidpublisher thật).
 * Xem docs/diagram/2 push-game-sequence.puml — từ đây trở đi MỌI bước tự động.
 */
public interface GooglePlayPublishService {
    /**
     * Tạo/cập nhật {@link ExternalPublish} cho version này và bắt đầu submit lên Google Play.
     * Fail-soft ở tầng gọi tương tự AiReviewClient — lỗi không nên chặn luồng admin.
     */
    ExternalPublish publishGameToStore(GameVersion version);

    /**
     * Google Play KHÔNG có webhook cho kết quả review — gọi định kỳ (cron) để kiểm tra
     * 1 bản submit đang ở trạng thái "submitted" đã có kết quả cuối chưa (live/rejected).
     * Cập nhật trực tiếp entity {@code publish} (status/liveAt/storeUrl/rejectedReason);
     * không thay đổi gì nếu vẫn đang chờ Google duyệt.
     */
    void checkReviewStatus(ExternalPublish publish);
}
