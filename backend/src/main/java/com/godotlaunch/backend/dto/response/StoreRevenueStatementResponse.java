package com.godotlaunch.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoreRevenueStatementResponse {
    private UUID id;
    private UUID externalPublishId;
    private UUID gameId;
    private String gameTitle;
    private String packageName;
    private String provider;
    private String periodKey;
    private String externalPayoutId;
    private BigDecimal grossRevenue;
    private BigDecimal googleFeeRate;
    private BigDecimal googleFeeAmount;
    private BigDecimal netStoreProceeds;
    private BigDecimal developerShareRate;
    private BigDecimal developerEarnings;
    private BigDecimal platformRetainedRevenue;
    private String currency;
    private String status;
    private Instant settledAt;
}
