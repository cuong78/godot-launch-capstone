package com.godotlaunch.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class FaceVerifyRequest {

    @NotBlank(message = "Challenge id is required.")
    private String challengeId;

    @NotNull
    @Size(min = 5, max = 5, message = "Exactly five challenge frames are required.")
    @Valid
    private List<Frame> frames;

    @Getter
    @Setter
    public static class Frame {
        @NotBlank
        @Pattern(regexp = "CENTER|TURN_LEFT|TURN_RIGHT|LOOK_UP|LOOK_DOWN")
        private String action;

        @NotBlank(message = "Face image is required.")
        @Size(max = 12_000_000, message = "Face image is too large.")
        private String imageBase64;

        @NotNull
        private Long capturedAt;
    }
}
