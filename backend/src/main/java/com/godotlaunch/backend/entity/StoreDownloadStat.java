package com.godotlaunch.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.ColumnTransformer;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Aggregate stats từ Google Play / App Store API — cron job pull hàng ngày.
 * UNIQUE (game_id, platform, stat_date): 1 dòng / game / platform / ngày.
 */
@Entity
@Table(name = "store_download_stats")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StoreDownloadStat {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    // ext_platform_enum: google_play | app_store. Map String + cast để không phụ thuộc enum Java riêng.
    @Column(name = "platform", nullable = false, columnDefinition = "ext_platform_enum")
    @ColumnTransformer(write = "?::ext_platform_enum")
    private String platform;

    @Column(name = "stat_date", nullable = false)
    private LocalDate statDate;

    @Column(name = "downloads", nullable = false)
    private Integer downloads = 0;

    @Column(name = "installs", nullable = false)
    private Integer installs = 0;

    @Column(name = "revenue", nullable = false, precision = 15, scale = 2)
    private BigDecimal revenue = BigDecimal.ZERO;

    @Column(name = "fetched_at", nullable = false, insertable = false, updatable = false)
    private Instant fetchedAt;
}
