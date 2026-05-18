package com.godotlaunch.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Builder
public class PublishingGuideResponse {
    private UUID id;
    private Short stepOrder;
    private String title;
    private String description;
    private String tip;
    private String videoUrl;
    private boolean isActive;
    private String createdByUsername;
    private Instant createdAt;
    private Instant updatedAt;
}
