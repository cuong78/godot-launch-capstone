package com.godotlaunch.backend.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class HomepageProductResponse {
    private UUID id;
    private String itemType;
    private String title;
    private String description;
    private String thumbnailUrl;
    private BigDecimal price;
    private UUID creatorId;
    private String creatorEmail;
    private String creatorName;
    private String categoryName;
    private List<String> tags;
    private Integer popularity;
    private Instant createdAt;
}
