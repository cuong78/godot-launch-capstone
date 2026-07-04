package com.godotlaunch.backend.entity;

import com.pgvector.PGvector;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Vector khuôn mặt (128-dim) của user, dùng để chặn đăng ký tài khoản thứ 2
 * bằng cùng 1 khuôn mặt (isDuplicateFace). Tách bảng riêng (không gộp vào
 * User) vì cần index ivfflat chuyên cho tìm kiếm cosine similarity.
 */
@Entity
@Table(name = "face_embeddings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FaceEmbedding {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // 1 user chỉ có đúng 1 embedding — giống ràng buộc KYC.
    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @Column(name = "embedding", nullable = false, columnDefinition = "vector(128)")
    private PGvector embedding;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;
}
