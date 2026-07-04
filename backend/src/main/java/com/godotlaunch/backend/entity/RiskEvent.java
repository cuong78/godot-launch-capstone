package com.godotlaunch.backend.entity;

import com.godotlaunch.backend.entity.enums.RiskEventType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.ColumnTransformer;

import java.time.Instant;
import java.util.UUID;

/**
 * Log MỌI lần 1 thiết bị xuất hiện — kể cả bị chặn (khác AuditLog: chỉ ghi
 * hành động nghiệp vụ đã thành công). Dùng để tính risk (đếm/group by IP,
 * fingerprint, thời gian) — không dùng để tra cứu lịch sử nghiệp vụ.
 */
@Entity
@Table(name = "risk_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RiskEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "device_fingerprint_id", nullable = false)
    private DeviceFingerprint deviceFingerprint;

    // NULL nếu lúc xảy ra chưa có tài khoản (VD: đang trong lúc signup).
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "ip_address", nullable = false, columnDefinition = "inet")
    @ColumnTransformer(write = "?::inet")
    private String ipAddress;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 30)
    private RiskEventType eventType;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;
}
