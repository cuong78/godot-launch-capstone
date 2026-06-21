package com.godotlaunch.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FaceVerifyRequest {

    @NotBlank(message = "Face image is required.")
    private String faceImageBase64;
}
