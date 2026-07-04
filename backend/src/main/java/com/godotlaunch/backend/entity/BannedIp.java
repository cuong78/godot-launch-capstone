package com.godotlaunch.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.ColumnTransformer;

import java.time.Instant;
import java.util.UUID;

/**
 * IP bị chặn — check tại API gateway trước khi xử lý request.
 * ip_address kiểu inet (hỗ trợ IPv4 + IPv6), UNIQUE: 1 IP 1 record.
 */
@Entity
@Table(name = "banned_ips")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BannedIp {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "ip_address", nullable = false, columnDefinition = "inet")
    @ColumnTransformer(write = "?::inet")
    private String ipAddress;

    @Column(name = "reason", nullable = false, length = 200)
    private String reason;

    // Account đã dẫn đến lệnh ban — để admin tra vết (nullable).
    @Column(name = "related_user_id")
    private UUID relatedUserId;

    @Column(name = "banned_at", nullable = false, insertable = false, updatable = false)
    private Instant bannedAt;

    // NULL = vĩnh viễn | NOT NULL = có thời hạn.
    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
}
