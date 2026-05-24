package com.godotlaunch.backend.dto.request;

import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class UpdateGameRequest {
    private String title;
    private String description;
    private BigDecimal priceProposed;
    private UUID categoryId;
}
