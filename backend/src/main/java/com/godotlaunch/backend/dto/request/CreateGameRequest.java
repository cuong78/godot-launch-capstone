package com.godotlaunch.backend.dto.request;

import com.godotlaunch.backend.entity.enums.PublishingType;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class CreateGameRequest {
    @NotBlank(message = "Title is required")
    private String title;
    
    private String description;
    
    private BigDecimal priceProposed;
    
    private UUID categoryId;

    private PublishingType publishingType;

    // Repo-based submit: link repo GitHub (thay cho upload game.zip)
    private String githubRepoUrl;

    private String githubBranch;
}
