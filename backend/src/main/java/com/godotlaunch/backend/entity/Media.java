package com.godotlaunch.backend.entity;

import com.godotlaunch.backend.entity.enums.MediaOwnerType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Media chung cho game + marketplace_item (polymorphic owner).
 * owner_type + owner_id thay cho FK cứng (vì owner trỏ 2 bảng khác nhau).
 * media_type: 'thumbnail' | 'screenshot' | 'video' | 'asset_image'.
 */
@Entity
@Table(name = "media")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Media {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "owner_type", nullable = false, length = 20)
    private MediaOwnerType ownerType;

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Column(name = "media_type", nullable = false, length = 20)
    private String mediaType;

    @Column(name = "media_url", nullable = false, columnDefinition = "TEXT")
    private String mediaUrl;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;
}
