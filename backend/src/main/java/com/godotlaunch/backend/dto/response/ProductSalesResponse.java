package com.godotlaunch.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductSalesResponse {
    private UUID productId;
    private String productType; // "GAME" | "ASSET"
    private String title;
    private String thumbnailUrl;
    private long unitsSold;
    private BigDecimal revenue;
    private long pendingCount;
    private long failedCount;
    private long cancelledCount;
    private long expiredCount;
}
