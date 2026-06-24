package com.godotlaunch.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GitHubLoginRequest {

    @NotBlank(message = "GitHub OAuth code is required.")
    private String code;

    private Boolean rememberMe = false;
}
