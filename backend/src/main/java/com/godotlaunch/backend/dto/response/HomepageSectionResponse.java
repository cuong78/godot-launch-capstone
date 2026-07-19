package com.godotlaunch.backend.dto.response;

import com.godotlaunch.backend.entity.enums.HomepageSectionType;
import lombok.*;
import java.util.*;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class HomepageSectionResponse {
    private UUID id;
    private String title;
    private HomepageSectionType sectionType;
    private UUID collectionId;
    private String collectionSlug;
    private Integer displayOrder;
    private Integer itemLimit;
    private boolean active;
    private boolean system;
    private List<HomepageProductResponse> products;
}
