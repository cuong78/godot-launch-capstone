package com.godotlaunch.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class CategoryResponse {
    private UUID id;
    private String name;
    private String slug;
    private String description;
    private UUID parentId;
    private String type;
    private String defaultName;
    private String nameVi;
    private String nameEn;
    private String nameJa;
    private String defaultDescription;
    private String descriptionVi;
    private String descriptionEn;
    private String descriptionJa;
    private Instant createdAt;
}
