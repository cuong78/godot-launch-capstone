package com.godotlaunch.backend.entity;

import com.godotlaunch.backend.entity.enums.ExtStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "external_publishes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ExternalPublish {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_version_id", nullable = false)
    private GameVersion gameVersion;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false, columnDefinition = "ext_status_enum")
    private ExtStatus status = ExtStatus.pending;

    @Column(name = "external_app_id", length = 200)
    private String externalAppId;

    @Column(name = "store_url", columnDefinition = "TEXT")
    private String storeUrl;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "live_at")
    private Instant liveAt;

    @Column(name = "rejected_reason", columnDefinition = "TEXT")
    private String rejectedReason;

    @Column(name = "provider", length = 50)
    private String provider = "GOOGLE_PLAY_MOCK";

    @Column(name = "package_name", unique = true)
    private String packageName;

    @Column(name = "reporting_enabled")
    private Boolean reportingEnabled = true;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "mock_registration_id", length = 100)
    private String mockRegistrationId;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private Instant updatedAt;
}
