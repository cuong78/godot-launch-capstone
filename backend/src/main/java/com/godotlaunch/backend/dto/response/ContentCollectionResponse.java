package com.godotlaunch.backend.dto.response;

import com.godotlaunch.backend.entity.enums.*;
import lombok.*;
import java.time.Instant;
import java.util.*;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ContentCollectionResponse {
    private UUID id;
    private String title;
    private String slug;
    private String description;
    private CollectionItemType itemType;
    private CollectionMatchMode matchMode;
    private CollectionSortMode sortMode;
    private Integer maxItems;
    private boolean active;
    private List<TagResponse> tags;
    private List<CategoryResponse> categories;
    private Instant createdAt;
    private Instant updatedAt;
}
