package com.godotlaunch.backend.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;
import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class UpdateHomepageSectionRequest {
    @NotBlank @Size(max = 160) private String title;
    private UUID collectionId;
    @NotNull @Min(0) private Integer displayOrder;
    private boolean active = true;
}
