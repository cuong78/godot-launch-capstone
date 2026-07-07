package com.godotlaunch.backend.dto.projection;

import java.math.BigDecimal;
import java.util.UUID;

public record ProductSalesRow(
        UUID productId,
        String title,
        String thumbnailUrl,
        Long unitsSold,
        BigDecimal revenue
) {
}
