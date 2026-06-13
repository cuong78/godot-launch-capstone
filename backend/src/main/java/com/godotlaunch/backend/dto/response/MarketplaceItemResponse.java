package com.godotlaunch.backend.dto.response;

import com.godotlaunch.backend.entity.enums.ItemStatus;
import com.godotlaunch.backend.entity.enums.ItemType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MarketplaceItemResponse {
    private UUID id;
    private String sellerEmail;
    private String sellerFullName;
    private UUID categoryId;
    private String categoryName;
    private ItemType itemType;
    private String title;
    private String description;
    private BigDecimal price;
    private String fileUrl;
    private String godotVersion;
    private UUID sourceGameId;
    private String sourceGameTitle;
    private String githubRepoUrl;
    private Instant githubVerifiedAt;
    private ItemStatus status;
    private Instant createdAt;
    private Instant updatedAt;
}
