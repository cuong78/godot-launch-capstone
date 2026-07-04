package com.godotlaunch.backend.entity.enums;

/**
 * Mức độ nghi ngờ đạo nhái theo similarity score (xem docs/plagiarism-detection-plan.md).
 * Không có mức tự động reject — AI chỉ đề xuất, admin luôn quyết định cuối.
 */
public enum PlagiarismSeverity {
    review,  // 70-90% — có thể trùng do dùng chung boilerplate/plugin phổ biến
    reject   // >90% — rất đáng ngờ, gần như chắc chắn copy
}
