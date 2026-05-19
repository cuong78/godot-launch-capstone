package com.godotlaunch.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminUpdateUserRequest {

    @NotBlank(message = "Full name is required.")
    @Size(max = 150, message = "Full name cannot exceed 150 characters.")
    private String fullName;

    @NotBlank(message = "Role is required.")
    private String roleName; // e.g. "admin", "developer", "player"

    @NotBlank(message = "Status is required.")
    private String status; // "active", "inactive", "banned"

    @Size(min = 6, message = "Password must be at least 6 characters if specified.")
    private String password; // optional password reset

    private String avatarUrl;
}
