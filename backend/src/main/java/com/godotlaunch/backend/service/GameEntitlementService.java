package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.response.GameEntitlementResponse;

import java.util.UUID;

public interface GameEntitlementService {
    GameEntitlementResponse getEntitlement(UUID gameId, String requesterEmail);
}
