package com.godotlaunch.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PublishingGuideRequest {

    @NotNull(message = "Step order is required")
    private Short stepOrder;

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Description is required")
    private String description;

    private String tip;
    
    private String videoUrl;
    
    private boolean isActive = true;
}
