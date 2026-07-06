package com.godotlaunch.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class StorageBucketRequest {
    @NotNull
    private UUID accountId;

    @NotBlank
    private String name;
    private String publicUrl;  // SeaweedFS only
}
