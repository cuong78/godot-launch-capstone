package com.godotlaunch.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameResponse {
    private UUID id;
    private String title;
    private String description;
    private String thumbnailUrl;
    private BigDecimal priceProposed;
    private BigDecimal downloadPrice;
    private boolean communityAvailable;
    private String status;
    private String uploadStatus;
    private String uploadError;
    private UUID creatorId;
    private String creatorEmail;
    private String creatorName;
    private String creatorFullName;
    private String categoryName;
    private String publishingType;
    private List<String> screenshots;
    private String videoUrl;
    private String fileUrl;
    private String webDemoUrl;
    private String version;
    private List<String> tags;
    private String githubRepoUrl;
    private String githubBranch;
    private java.time.Instant createdAt;
    private java.time.Instant updatedAt;
    private UUID pendingUpdateSnapshotId;
    private String pendingUpdateFileUrl;
    private String pendingTitle;
    private String pendingDescription;
    private String pendingThumbnailUrl;
    private String pendingVideoUrl;
    private List<String> pendingScreenshots;
    private List<String> pendingTags;
    private BigDecimal averageRating;
    private Integer reviewCount;
}

