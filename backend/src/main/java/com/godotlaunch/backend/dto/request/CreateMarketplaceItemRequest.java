package com.godotlaunch.backend.dto.request;

import com.godotlaunch.backend.entity.enums.ItemType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class CreateMarketplaceItemRequest {
    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.0", message = "Price must be greater than or equal to 0")
    private BigDecimal price;

    @NotNull(message = "Item type is required")
    private ItemType itemType;

    private UUID categoryId;

    private String godotVersion;

    private String githubRepoUrl;

    private UUID sourceGameId;

    private String fileUrl;

    private String thumbnailUrl;

    private String license;

    private String documentation;

    private String version;

    private String supportedPlatforms;

    private java.util.List<String> tags;
}
