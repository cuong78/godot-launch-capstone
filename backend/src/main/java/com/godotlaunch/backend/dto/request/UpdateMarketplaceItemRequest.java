package com.godotlaunch.backend.dto.request;

import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class UpdateMarketplaceItemRequest {
    private String title;
    private String description;
    private BigDecimal price;
    private UUID categoryId;
    private String godotVersion;
    private String githubRepoUrl;
    private String fileUrl;
    private String thumbnailUrl;
    private String license;
    private String licenseTerms;
    private String documentation;
    private String version;
    private String supportedPlatforms;
    private java.util.List<String> tags;
}
