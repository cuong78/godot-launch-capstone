package com.godotlaunch.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Blacklist đa tầng: face + CCCD + bank. Chặn user bị ban đăng ký/thêm bank lại.
 * face_embedding lưu kiểu vector(128) — query qua native SQL (pgvector).
 */
@Entity
@Table(name = "banned_identities")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BannedIdentity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "kyc_id_number", columnDefinition = "TEXT")
    private String kycIdNumber;        // đã encrypt

    @Column(name = "bank_account", columnDefinition = "TEXT")
    private String bankAccount;        // đã encrypt

    @Column(name = "reason", length = 50, nullable = false)
    private String reason;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "banned_at", nullable = false, insertable = false, updatable = false)
    private Instant bannedAt;
}
