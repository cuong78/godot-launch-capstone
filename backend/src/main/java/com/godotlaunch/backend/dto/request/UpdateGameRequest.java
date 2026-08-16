package com.godotlaunch.backend.dto.request;

import com.godotlaunch.backend.entity.enums.PublishingType;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
public class UpdateGameRequest {
    private String title;
    private String description;
    private BigDecimal priceProposed;
    private UUID categoryId;
    private PublishingType publishingType;
    private List<UUID> tagIds;
    private List<String> tags;
}
