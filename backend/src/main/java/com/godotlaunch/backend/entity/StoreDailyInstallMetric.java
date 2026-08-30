package com.godotlaunch.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "store_daily_install_metrics",
       uniqueConstraints = {
           @UniqueConstraint(name = "uq_store_daily_metrics", columnNames = {"external_publish_id", "metric_date", "country_code"})
       })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StoreDailyInstallMetric {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "external_publish_id", nullable = false)
    private ExternalPublish externalPublish;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    @Column(name = "metric_date", nullable = false)
    private LocalDate metricDate;

    @Column(name = "country_code", nullable = false, length = 10)
    private String countryCode;

    @Builder.Default
    @Column(name = "daily_user_installs", nullable = false)
    private Integer dailyUserInstalls = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_import_id")
    private StoreReportImport sourceImport;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    @Builder.Default
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();
}
