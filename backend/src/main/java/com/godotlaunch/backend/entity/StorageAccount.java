package com.godotlaunch.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "storage_accounts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StorageAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 20)
    private String provider; // 'aws_s3' | 'seaweedfs'

    @Column(nullable = false, columnDefinition = "TEXT")
    private String config; // AES-256 encrypted JSON

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "account", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private List<StorageBucket> buckets;
}
