package com.godotlaunch.backend.dto.response;

import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
public class StorageAccountResponse {
    private UUID id;
    private String name;
    private String provider;
    private boolean isActive;
    private Instant createdAt;
    // config KHÔNG trả về — không expose credentials
}
