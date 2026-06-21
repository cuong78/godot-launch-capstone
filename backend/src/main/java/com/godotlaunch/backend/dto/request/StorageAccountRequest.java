package com.godotlaunch.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class StorageAccountRequest {
    @NotBlank
    private String name;

    @NotBlank
    @Pattern(regexp = "aws_s3|seaweedfs", message = "provider must be 'aws_s3' or 'seaweedfs'")
    private String provider;

    // Plain JSON config — sẽ được encrypt trước khi lưu
    // aws_s3:    { "bucket":"...", "region":"...", "accessKey":"...", "secretKey":"..." }
    // seaweedfs: { "masterUrl":"...", "publicBaseUrl":"..." }
    @NotBlank
    private String config;

    private boolean isActive = true;
}
