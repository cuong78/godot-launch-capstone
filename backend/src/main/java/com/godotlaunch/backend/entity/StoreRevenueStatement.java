package com.godotlaunch.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "store_revenue_statements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StoreRevenueStatement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "external_publish_id", nullable = false)
    private ExternalPublish externalPublish;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    @Builder.Default
    @Column(name = "provider", nullable = false, length = 50)
    private String provider = "GOOGLE_PLAY_MOCK";

    @Column(name = "period_key", nullable = false, length = 50)
    private String periodKey;

    @Column(name = "external_payout_id", nullable = false, unique = true, length = 100)
    private String externalPayoutId;

    @Builder.Default
    @Column(name = "gross_revenue", nullable = false, precision = 15, scale = 2)
    private BigDecimal grossRevenue = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "google_fee_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal googleFeeRate = new BigDecimal("15.00");

    @Builder.Default
    @Column(name = "google_fee_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal googleFeeAmount = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "net_store_proceeds", nullable = false, precision = 15, scale = 2)
    private BigDecimal netStoreProceeds = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "developer_share_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal developerShareRate = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "developer_earnings", nullable = false, precision = 15, scale = 2)
    private BigDecimal developerEarnings = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "platform_retained_revenue", nullable = false, precision = 15, scale = 2)
    private BigDecimal platformRetainedRevenue = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "currency", nullable = false, length = 10)
    private String currency = "VND";

    @Builder.Default
    @Column(name = "status", nullable = false, length = 20)
    private String status = "paid";

    @Builder.Default
    @Column(name = "settled_at", nullable = false)
    private Instant settledAt = Instant.now();

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;
}
