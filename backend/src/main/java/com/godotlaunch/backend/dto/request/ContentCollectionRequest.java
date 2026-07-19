package com.godotlaunch.backend.dto.request;

import com.godotlaunch.backend.entity.enums.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.util.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class ContentCollectionRequest {
    @NotBlank @Size(max = 160) private String title;
    @NotBlank @Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$") @Size(max = 180) private String slug;
    @Size(max = 2000) private String description;
    @NotNull private CollectionItemType itemType;
    @NotNull private CollectionMatchMode matchMode;
    @NotNull private CollectionSortMode sortMode;
    @NotNull @Min(1) @Max(10) private Integer maxItems;
    private boolean active = true;
    private Set<UUID> tagIds = new HashSet<>();
    private Set<UUID> categoryIds = new HashSet<>();
}
