package com.godotlaunch.backend.service;

import com.godotlaunch.backend.entity.WithdrawalRequest;

import java.util.UUID;

public interface WithdrawalStatusSynchronizer {
    WithdrawalRequest synchronize(UUID requestId, String adminEmail);
}
