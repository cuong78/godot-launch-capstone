package com.godotlaunch.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "store_report_imports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StoreReportImport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "provider", nullable = false, length = 50)
    private String provider = "GOOGLE_PLAY_MOCK";

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "external_publish_id", nullable = false)
    private ExternalPublish externalPublish;

    @Column(name = "source_object_path", columnDefinition = "TEXT")
    private String sourceObjectPath;

    @Column(name = "report_month", length = 50)
    private String reportMonth;

    @Column(name = "synced_at", nullable = false)
    private Instant syncedAt = Instant.now();

    @Column(name = "raw_file_url", columnDefinition = "TEXT")
    private String rawFileUrl;

    @Column(name = "file_checksum", length = 64)
    private String fileChecksum;

    @Column(name = "row_count")
    private Integer rowCount = 0;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "succeeded";

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;
}
