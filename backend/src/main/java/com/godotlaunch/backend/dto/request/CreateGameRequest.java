package com.godotlaunch.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class CreateGameRequest {
    @NotBlank(message = "Title is required")
    private String title;
    
    private String description;
    
    private BigDecimal priceProposed;
    
    private UUID categoryId;
}
