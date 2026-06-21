package com.godotlaunch.backend.dto.response;

import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
public class StorageBucketResponse {
    private UUID id;
    private UUID accountId;
    private String accountName;
    private String provider;
    private String name;
    private String region;
    private String publicUrl;
    private Instant createdAt;
}
