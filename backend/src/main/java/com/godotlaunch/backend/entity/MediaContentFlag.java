package com.godotlaunch.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "media_content_flags")
@Getter
@Setter
@NoArgsConstructor
public class MediaContentFlag {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "media_url", nullable = false, columnDefinition = "TEXT")
    private String mediaUrl;

    @Column(name = "media_type", length = 20)
    private String mediaType;  // "image" | "video"

    @Column(name = "owner_type", nullable = false, length = 50)
    private String ownerType;  // "game" | "marketplace_item"

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Column(name = "owner_name", columnDefinition = "TEXT")
    private String ownerName;

    @Column(name = "nsfw_score", nullable = false)
    private double nsfwScore;

    @Column(name = "flagged", nullable = false)
    private boolean flagged;

    @Column(name = "flag_details", columnDefinition = "JSONB")
    private String flagDetails;  // JSON array của perImage results

    @Column(name = "status", nullable = false, length = 20)
    private String status = "pending";  // pending | approved | removed | warned

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "reviewer_note", columnDefinition = "TEXT")
    private String reviewerNote;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;
}
