package com.godotlaunch.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "storage_buckets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StorageBucket {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id", nullable = false)
    private StorageAccount account;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 50)
    private String region; // S3 only

    @Column(name = "public_url", columnDefinition = "TEXT")
    private String publicUrl; // SeaweedFS base URL

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "bucket", fetch = FetchType.LAZY)
    private List<StorageRouting> routings;
}
