package com.godotlaunch.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.UUID;

@Data
public class CategoryRequest {
    @NotBlank(message = "Category name is required")
    private String name;
    
    @NotBlank(message = "Slug is required")
    private String slug;
    
    private String description;
    
    private UUID parentId;
}
