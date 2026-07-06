package com.godotlaunch.backend.service;

import com.godotlaunch.backend.entity.WithdrawalRequest;

import java.util.UUID;

public interface WithdrawalStatusSynchronizer {
    // adminEmail: email admin thật khi được gọi từ hành động của admin; null khi được gọi bởi scheduled job tự động đồng bộ.
    WithdrawalRequest synchronize(UUID requestId, String adminEmail);
}
