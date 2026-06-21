package com.godotlaunch.backend.dto.response;

import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
public class StorageRoutingResponse {
    private String fileType;
    private UUID bucketId;
    private String bucketName;
    private UUID accountId;
    private String accountName;
    private String provider;
    private Instant updatedAt;
}
