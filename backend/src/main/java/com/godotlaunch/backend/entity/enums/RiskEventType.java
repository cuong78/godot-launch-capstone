package com.godotlaunch.backend.entity.enums;

/**
 * Loại sự kiện ghi vào RiskEvent — bao gồm cả sự kiện BỊ CHẶN
 * (khác AuditLog: chỉ ghi hành động nghiệp vụ đã thành công).
 */
public enum RiskEventType {
    signup,
    login,
    upload_asset,
    submit_game,
    blocked_captcha,
    blocked_rate_limit
}
