package com.godotlaunch.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "game_versions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class GameVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    @Column(name = "version_number", nullable = false, length = 50)
    private String versionNumber;

    @Column(columnDefinition = "TEXT")
    private String changelog;

    @Column(name = "file_url", nullable = false, columnDefinition = "TEXT")
    private String fileUrl;

    @Column(name = "is_current", nullable = false)
    private boolean isCurrent = false;

    @Column(name = "released_at", nullable = false, insertable = false, updatable = false)
    private Instant releasedAt;
    
}
