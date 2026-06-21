package com.godotlaunch.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class KycOcrRequest {

    @NotBlank(message = "Document image is required.")
    private String imageBase64;

    @NotBlank(message = "Document type is required.")
    @Pattern(regexp = "cccd|passport", message = "documentType must be 'cccd' or 'passport'.")
    private String documentType;
}
