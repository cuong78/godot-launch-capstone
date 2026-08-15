package com.godotlaunch.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Blacklist đa tầng (face + CCCD + bank) — chặn user bị ban đăng ký/thêm bank
 * lại. Các cột face embedding (legacy 128-dim và ArcFace 512-dim) KHÔNG map ở đây — AI service
 * face-service tự INSERT trực tiếp qua raw SQL (nhất quán với cách Embedding
 * hiện tại cũng không có JPA repository, tránh Java phải cầm vector qua
 * network).
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
    private String kycIdNumber;

    @Column(name = "bank_account", columnDefinition = "TEXT")
    private String bankAccount;

    @Column(name = "reason", nullable = false, length = 50)
    private String reason;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "banned_at", nullable = false, insertable = false, updatable = false)
    private Instant bannedAt;
}
