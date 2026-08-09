package com.godotlaunch.backend.entity;

import com.godotlaunch.backend.entity.enums.GameStatus;
import com.godotlaunch.backend.entity.enums.PublishingType;
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
@Table(name = "games")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Game {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "creator_id", nullable = false)
    private User creator;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "game_tags",
            joinColumns = @JoinColumn(name = "game_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id"))
    private Set<Tag> tags = new HashSet<>();


    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "thumbnail_url", columnDefinition = "TEXT")
    private String thumbnailUrl;

    // Trỏ tới index.html bản Web build (Godot export "Web") đã giải nén trên
    // storage — cho buyer chơi thử ngay trên trình duyệt trước khi mua, KHÔNG
    // lộ source (WebAssembly đã biên dịch). NULL nếu seller không cung cấp.
    // Seller tự chịu trách nhiệm giới hạn nội dung bản demo.
    @Column(name = "web_demo_url", columnDefinition = "TEXT")
    private String webDemoUrl;

    @Column(name = "github_repo_url", columnDefinition = "TEXT")
    private String githubRepoUrl;

    @Column(name = "github_branch", length = 100)
    private String githubBranch;

    @Column(name = "github_verified_at")
    private Instant githubVerifiedAt;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false, columnDefinition = "game_status_enum")
    private GameStatus status = GameStatus.draft;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "publishing_type", columnDefinition = "publishing_type_enum")
    private PublishingType publishingType;

    @Column(name = "price_proposed", precision = 15, scale = 2)
    private BigDecimal priceProposed;

    @Column(name = "download_count", nullable = false)
    private Integer downloadCount = 0;

    @Column(name = "is_source_listed", nullable = false)
    private boolean isSourceListed = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pending_update_snapshot_id")
    private SourceSnapshot pendingUpdateSnapshot;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private Instant updatedAt;
}