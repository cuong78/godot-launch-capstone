package com.godotlaunch.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SubmitGameRepoRequest {
    @NotBlank(message = "Repo URL is required")
    private String repoUrl;

    private String branch;
}
