package com.godotlaunch.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeveloperSalesStatsResponse {
    private UUID developerId;
    private String developerEmail;
    private String developerFullName;
    private String currency;
    private long totalUnitsSold;
    private BigDecimal totalRevenue;
    private List<ProductSalesResponse> products;
}
