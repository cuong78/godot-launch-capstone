package com.godotlaunch.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class StorageRoutingRequest {
    @NotBlank
    private String fileType;

    @NotNull
    private UUID bucketId;
}
