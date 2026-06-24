package com.godotlaunch.backend.service;

import com.godotlaunch.backend.entity.User;

public interface BannedIdentityService {
    /**
     * Ban user: copy face embedding (nếu có) + KYC số + bank account vào blacklist.
     * Chặn user đăng ký lại / thêm bank lại sau này.
     */
    void banUser(User user, String reason);

    /** Kiểm tra face embedding có khớp identity bị ban không. */
    boolean isFaceBanned(String embeddingVectorLiteral);

    /** Kiểm tra số CCCD đã bị ban chưa (so encrypted). */
    boolean isKycBanned(String plainIdNumber);

    /** Kiểm tra bank account đã bị ban chưa (so encrypted). */
    boolean isBankBanned(String plainBankAccount);
}
