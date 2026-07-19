package com.godotlaunch.backend.entity;

import com.godotlaunch.backend.entity.enums.HomepageSectionType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "homepage_sections")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class HomepageSection {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "title", nullable = false, length = 160)
    private String title;
    @Enumerated(EnumType.STRING) @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "section_type", nullable = false, columnDefinition = "homepage_section_type_enum")
    private HomepageSectionType sectionType;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "collection_id")
    private ContentCollection collection;
    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;
    @Column(name = "item_limit", nullable = false)
    private Integer itemLimit = 6;
    @Column(name = "is_active", nullable = false)
    private boolean active = true;
    @Column(name = "is_system", nullable = false)
    private boolean system;
    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private Instant updatedAt;
}
