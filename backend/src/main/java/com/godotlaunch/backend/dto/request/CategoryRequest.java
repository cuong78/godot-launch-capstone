package com.godotlaunch.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.UUID;

@Data
public class CategoryRequest {
    @NotBlank(message = "Category name is required")
    private String name;

    private String nameVi;
    private String nameEn;
    private String nameJa;
    
    @NotBlank(message = "Slug is required")
    private String slug;
    
    private String description;

    private String descriptionVi;
    private String descriptionEn;
    private String descriptionJa;

    private UUID parentId;

    @NotBlank(message = "Type is required")
    private String type;
}
