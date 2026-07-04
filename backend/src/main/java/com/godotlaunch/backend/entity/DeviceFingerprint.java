package com.godotlaunch.backend.entity;

import com.godotlaunch.backend.entity.enums.DeviceRiskStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Hồ sơ rủi ro của 1 thiết bị vật lý — độc lập với tài khoản đã đăng nhập.
 * Trạng thái HIỆN TẠI (1 row/thiết bị, ghi đè liên tục). Lịch sử chi tiết
 * từng lần xuất hiện nằm ở RiskEvent.
 */
@Entity
@Table(name = "device_fingerprints")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DeviceFingerprint {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "fingerprint_hash", nullable = false, unique = true, length = 128)
    private String fingerprintHash;

    @Column(name = "first_seen_at", nullable = false, insertable = false, updatable = false)
    private Instant firstSeenAt;

    @Column(name = "last_seen_at", nullable = false)
    private Instant lastSeenAt;

    @Column(name = "risk_score", nullable = false)
    private Integer riskScore = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private DeviceRiskStatus status = DeviceRiskStatus.normal;
}
