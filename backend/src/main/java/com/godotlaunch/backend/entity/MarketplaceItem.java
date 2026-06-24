package com.godotlaunch.backend.entity;

import com.godotlaunch.backend.entity.enums.ItemStatus;
import com.godotlaunch.backend.entity.enums.ItemType;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Entity
@Table(name = "marketplace_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MarketplaceItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "seller_id", nullable = false)
    private User seller;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "item_type", nullable = false, columnDefinition = "item_type_enum")
    private ItemType itemType;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "price", nullable = false, precision = 15, scale = 2)
    private BigDecimal price;

    @Column(name = "file_url", nullable = false, columnDefinition = "TEXT")
    private String fileUrl;

    @Column(name = "thumbnail_url", columnDefinition = "TEXT")
    private String thumbnailUrl;

    @Column(name = "license", length = 50)
    private String license;

    @Column(name = "documentation", columnDefinition = "TEXT")
    private String documentation;

    @Column(name = "version", length = 50)
    private String version = "1.0.0";

    @Column(name = "supported_platforms", length = 200)
    private String supportedPlatforms;

    @Column(name = "godot_version", length = 20)
    private String godotVersion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_game_id")
    private Game sourceGame;

    @Column(name = "github_repo_url", columnDefinition = "TEXT")
    private String githubRepoUrl;

    @Column(name = "github_verified_at")
    private Instant githubVerifiedAt;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false, columnDefinition = "item_status_enum")
    private ItemStatus status = ItemStatus.active;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "marketplace_item_tags",
            joinColumns = @JoinColumn(name = "marketplace_item_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id"))
    private Set<Tag> tags = new HashSet<>();

    @OneToMany(mappedBy = "marketplaceItem", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<MarketplaceItemMedia> mediaFiles = new ArrayList<>();

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private Instant updatedAt;
}
