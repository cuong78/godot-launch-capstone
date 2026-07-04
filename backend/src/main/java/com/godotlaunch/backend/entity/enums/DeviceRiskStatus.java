package com.godotlaunch.backend.entity.enums;

/**
 * Trạng thái rủi ro của 1 thiết bị (device fingerprint) — quyết định chặn hay cho qua.
 * Không ban theo IP tĩnh nữa (xem docs/banned-ip-device-risk-plan.md).
 */
public enum DeviceRiskStatus {
    normal,     // bình thường, không hạn chế
    cooldown,   // tạm hạn chế (VD: bắt CAPTCHA/OTP, giới hạn signup/upload)
    banned      // chặn hẳn
}
