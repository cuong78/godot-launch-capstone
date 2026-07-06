package com.godotlaunch.backend.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class StorageAccountRequest {
    @NotBlank
    private String name;

    @NotBlank
    @Pattern(regexp = "seaweedfs", message = "provider must be 'seaweedfs'")
    private String provider;

    // Plain JSON config — sẽ được encrypt trước khi lưu
    // seaweedfs: { "masterUrl":"...", "publicBaseUrl":"..." }
    @NotBlank
    private String config;

    @JsonProperty("isActive")
    private boolean isActive = true;
}
