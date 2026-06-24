package com.godotlaunch.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "marketplace_item_media")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MarketplaceItemMedia {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_id", nullable = false)
    private MarketplaceItem marketplaceItem;

    @Column(name = "media_type", nullable = false, length = 20)
    private String mediaType;

    @Column(name = "media_url", nullable = false, columnDefinition = "TEXT")
    private String mediaUrl;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;
}
