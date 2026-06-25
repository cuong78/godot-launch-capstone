package com.godotlaunch.backend.entity.enums;

/**
 * Đề xuất tổng của AI review — CHỈ gợi ý, admin quyết định cuối.
 */
public enum AiRecommendation {
    approve,   // tất cả điểm cao, không flag → AI đề xuất duyệt
    review,    // cần người xem (mặc định)
    reject     // có vi phạm nghiêm trọng (NSFW, secret, điểm rất thấp)
}
