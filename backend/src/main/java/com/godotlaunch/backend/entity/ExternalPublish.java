package com.godotlaunch.backend.entity;

import com.godotlaunch.backend.entity.enums.ExtPlatform;
import com.godotlaunch.backend.entity.enums.ExtStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

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
    @Column(name = "platform", nullable = false, columnDefinition = "ext_platform_enum")
    private ExtPlatform platform;

    @Enumerated(EnumType.STRING)
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

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "submitted_by", nullable = false)
    private User submittedBy;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private Instant updatedAt;
}
