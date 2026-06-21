package com.godotlaunch.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "storage_routing")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StorageRouting {

    @Id
    @Column(name = "file_type", length = 50)
    private String fileType;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bucket_id", nullable = false)
    private StorageBucket bucket;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private Instant updatedAt;
}
