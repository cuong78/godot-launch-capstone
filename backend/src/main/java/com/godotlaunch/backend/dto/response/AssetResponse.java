package com.godotlaunch.backend.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.godotlaunch.backend.entity.enums.ItemStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssetResponse {
    private UUID id;
    private UUID sellerId;
    private String sellerEmail;
    private String sellerFullName;
    private UUID categoryId;
    private String categoryName;
    private String title;
    private String description;
    private BigDecimal price;
    private String fileUrl;
    private String thumbnailUrl;

    private String version;
    private String supportedPlatforms;
    private List<String> tags;
    private String pendingTitle;
    private String pendingDescription;
    private String pendingThumbnailUrl;
    private List<String> pendingTags;
    private ItemStatus status;
    private String uploadStatus;
    private String uploadError;
    private List<String> mediaUrls;
    private String videoUrl;
    private List<String> screenshots;
    private BigDecimal averageRating;
    private Integer reviewCount;
    private Instant createdAt;
    private Instant updatedAt;
}
