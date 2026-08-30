package com.godotlaunch.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoreRevenueSummaryResponse {
    private BigDecimal totalGrossRevenue;
    private BigDecimal totalGoogleFee;
    private BigDecimal totalNetStoreProceeds;
    private BigDecimal totalDeveloperPayable;
    private BigDecimal totalPlatformRetained;
    private Long totalPublishedGames;
    private Long totalDailyUserInstalls;
}
