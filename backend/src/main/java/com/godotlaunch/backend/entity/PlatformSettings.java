package com.godotlaunch.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalTime;

@Entity
@Table(name = "platform_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PlatformSettings {

    @Id
    @Column(name = "id", nullable = false)
    private Short id;

    @Column(name = "commission_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal commissionRate = BigDecimal.TEN;

    @Column(name = "withdrawal_hold_days", nullable = false)
    private Short withdrawalHoldDays = 5;

    @Column(name = "refund_deadline_days", nullable = false)
    private Short refundDeadlineDays = 5;

    /**
     * Giờ chạy 2 job maintenance hàng ngày (WithdrawalAutoPayoutScheduler,
     * DisputeRefundEnforcementScheduler) — luôn hiểu là giờ Việt Nam
     * (Asia/Ho_Chi_Minh), xem DynamicDailyCronTrigger.
     */
    @Column(name = "daily_maintenance_time", nullable = false)
    private LocalTime dailyMaintenanceTime = LocalTime.of(2, 0, 0);

    @Column(name = "maintenance_mode", nullable = false)
    private boolean maintenanceMode;

    @Column(name = "announcement_banner", columnDefinition = "TEXT")
    private String announcementBanner;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (id == null) {
            id = 1;
        }
        updatedAt = Instant.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
