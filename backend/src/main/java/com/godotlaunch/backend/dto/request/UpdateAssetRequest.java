package com.godotlaunch.backend.dto.request;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
public class UpdateAssetRequest {
    private String title;
    private String description;
    private BigDecimal price;
    private UUID categoryId;

    private String fileUrl;

    private String thumbnailUrl;

    private String version;
    private String supportedPlatforms;
    private List<UUID> tagIds;
    private List<String> tags;
}
