package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.UpdatePlatformSettingsRequest;
import com.godotlaunch.backend.dto.response.PlatformSettingsResponse;
import com.godotlaunch.backend.entity.PlatformSettings;
import com.godotlaunch.backend.event.PlatformSettingsUpdatedEvent;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.PlatformSettingsRepository;
import com.godotlaunch.backend.service.PlatformSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalTime;

@Service
@RequiredArgsConstructor
public class PlatformSettingsServiceImpl implements PlatformSettingsService {

    private static final short SETTINGS_ID = 1;
    private static final BigDecimal DEFAULT_COMMISSION_RATE = new BigDecimal("10.00");
    private static final BigDecimal MAX_COMMISSION_RATE = new BigDecimal("100.00");
    private static final short DEFAULT_WITHDRAWAL_HOLD_DAYS = 5;
    private static final short MAX_WITHDRAWAL_HOLD_DAYS = 30;
    private static final short DEFAULT_REFUND_DEADLINE_DAYS = 5;
    private static final short MIN_REFUND_DEADLINE_DAYS = 1;
    private static final short MAX_REFUND_DEADLINE_DAYS = 30;
    private static final short DEFAULT_DISPUTE_BAN_THRESHOLD = 3;
    private static final short MIN_DISPUTE_BAN_THRESHOLD = 1;
    private static final short MAX_DISPUTE_BAN_THRESHOLD = 20;
    private static final LocalTime DEFAULT_DAILY_MAINTENANCE_TIME = LocalTime.of(2, 0, 0);
    private static final String DEFAULT_ANNOUNCEMENT = "GodotLaunch Matrix Engine Upgrade is complete!";

    private final PlatformSettingsRepository platformSettingsRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional(readOnly = true)
    public PlatformSettingsResponse getPlatformSettings() {
        return platformSettingsRepository.findById(SETTINGS_ID)
                .map(this::mapToResponse)
                .orElseGet(this::buildDefaultResponse);
    }

    @Override
    @Transactional
    public PlatformSettingsResponse updatePlatformSettings(UpdatePlatformSettingsRequest request) {
        BigDecimal normalizedRate = normalizeCommissionRate(request.getCommissionRate());
        short normalizedHoldDays = normalizeWithdrawalHoldDays(request.getWithdrawalHoldDays());
        short normalizedRefundDeadlineDays = normalizeRefundDeadlineDays(request.getRefundDeadlineDays());
        short normalizedDisputeBanThreshold = normalizeDisputeBanThreshold(request.getDisputeBanThreshold());
        LocalTime normalizedDailyMaintenanceTime = normalizeDailyMaintenanceTime(request.getDailyMaintenanceTime());

        PlatformSettings settings = platformSettingsRepository.findById(SETTINGS_ID)
                .orElseGet(() -> {
                    PlatformSettings created = new PlatformSettings();
                    created.setId(SETTINGS_ID);
                    return created;
                });

        settings.setCommissionRate(normalizedRate);
        settings.setWithdrawalHoldDays(normalizedHoldDays);
        settings.setRefundDeadlineDays(normalizedRefundDeadlineDays);
        settings.setDisputeBanThreshold(normalizedDisputeBanThreshold);
        settings.setDailyMaintenanceTime(normalizedDailyMaintenanceTime);
        settings.setMaintenanceMode(Boolean.TRUE.equals(request.getMaintenanceMode()));
        settings.setAnnouncementBanner(normalizeAnnouncement(request.getAnnouncementBanner()));

        PlatformSettingsResponse response = mapToResponse(platformSettingsRepository.save(settings));

        // Báo cho DailyMaintenanceScheduler re-schedule ngay theo giờ mới —
        // KHÔNG publish thẳng ở đây vì transaction hiện tại CHƯA commit
        // (save() chỉ flush), listener đọc lại DB ngay lúc này có thể vẫn
        // thấy giá trị cũ. Đợi transaction commit xong mới publish (đã từng
        // gặp đúng race condition tương tự ở WithdrawalRequestServiceImpl).
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    eventPublisher.publishEvent(new PlatformSettingsUpdatedEvent(PlatformSettingsServiceImpl.this));
                }
            });
        } else {
            eventPublisher.publishEvent(new PlatformSettingsUpdatedEvent(this));
        }

        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal getPlatformCommissionRate() {
        return platformSettingsRepository.findById(SETTINGS_ID)
                .map(PlatformSettings::getCommissionRate)
                .filter(rate -> rate != null)
                .orElse(DEFAULT_COMMISSION_RATE);
    }

    @Override
    @Transactional(readOnly = true)
    public short getWithdrawalHoldDays() {
        return platformSettingsRepository.findById(SETTINGS_ID)
                .map(PlatformSettings::getWithdrawalHoldDays)
                .filter(days -> days != null)
                .orElse(DEFAULT_WITHDRAWAL_HOLD_DAYS);
    }

    @Override
    @Transactional(readOnly = true)
    public short getRefundDeadlineDays() {
        return platformSettingsRepository.findById(SETTINGS_ID)
                .map(PlatformSettings::getRefundDeadlineDays)
                .filter(days -> days != null)
                .orElse(DEFAULT_REFUND_DEADLINE_DAYS);
    }

    @Override
    @Transactional(readOnly = true)
    public short getDisputeBanThreshold() {
        return platformSettingsRepository.findById(SETTINGS_ID)
                .map(PlatformSettings::getDisputeBanThreshold)
                .filter(threshold -> threshold != null)
                .orElse(DEFAULT_DISPUTE_BAN_THRESHOLD);
    }

    @Override
    @Transactional(readOnly = true)
    public LocalTime getDailyMaintenanceTime() {
        return platformSettingsRepository.findById(SETTINGS_ID)
                .map(PlatformSettings::getDailyMaintenanceTime)
                .filter(time -> time != null)
                .orElse(DEFAULT_DAILY_MAINTENANCE_TIME);
    }

    private PlatformSettingsResponse buildDefaultResponse() {
        return new PlatformSettingsResponse(
                DEFAULT_COMMISSION_RATE,
                DEFAULT_WITHDRAWAL_HOLD_DAYS,
                DEFAULT_REFUND_DEADLINE_DAYS,
                DEFAULT_DISPUTE_BAN_THRESHOLD,
                DEFAULT_DAILY_MAINTENANCE_TIME,
                false,
                DEFAULT_ANNOUNCEMENT,
                null
        );
    }

    private PlatformSettingsResponse mapToResponse(PlatformSettings settings) {
        return new PlatformSettingsResponse(
                settings.getCommissionRate() != null ? settings.getCommissionRate() : DEFAULT_COMMISSION_RATE,
                settings.getWithdrawalHoldDays() != null ? settings.getWithdrawalHoldDays() : DEFAULT_WITHDRAWAL_HOLD_DAYS,
                settings.getRefundDeadlineDays() != null ? settings.getRefundDeadlineDays() : DEFAULT_REFUND_DEADLINE_DAYS,
                settings.getDisputeBanThreshold() != null ? settings.getDisputeBanThreshold() : DEFAULT_DISPUTE_BAN_THRESHOLD,
                settings.getDailyMaintenanceTime() != null ? settings.getDailyMaintenanceTime() : DEFAULT_DAILY_MAINTENANCE_TIME,
                settings.isMaintenanceMode(),
                settings.getAnnouncementBanner(),
                settings.getUpdatedAt()
        );
    }

    private BigDecimal normalizeCommissionRate(BigDecimal commissionRate) {
        if (commissionRate == null
                || commissionRate.compareTo(BigDecimal.ZERO) < 0
                || commissionRate.compareTo(MAX_COMMISSION_RATE) > 0) {
            throw new AppException(ErrorCode.PLATFORM_COMMISSION_RATE_INVALID);
        }

        return commissionRate.setScale(2, RoundingMode.HALF_UP);
    }

    private short normalizeWithdrawalHoldDays(Short withdrawalHoldDays) {
        if (withdrawalHoldDays == null
                || withdrawalHoldDays < 0
                || withdrawalHoldDays > MAX_WITHDRAWAL_HOLD_DAYS) {
            throw new AppException(ErrorCode.WITHDRAWAL_HOLD_DAYS_INVALID);
        }

        return withdrawalHoldDays;
    }

    private short normalizeRefundDeadlineDays(Short refundDeadlineDays) {
        if (refundDeadlineDays == null
                || refundDeadlineDays < MIN_REFUND_DEADLINE_DAYS
                || refundDeadlineDays > MAX_REFUND_DEADLINE_DAYS) {
            throw new AppException(ErrorCode.REFUND_DEADLINE_DAYS_INVALID);
        }

        return refundDeadlineDays;
    }

    private short normalizeDisputeBanThreshold(Short disputeBanThreshold) {
        if (disputeBanThreshold == null
                || disputeBanThreshold < MIN_DISPUTE_BAN_THRESHOLD
                || disputeBanThreshold > MAX_DISPUTE_BAN_THRESHOLD) {
            throw new AppException(ErrorCode.DISPUTE_BAN_THRESHOLD_INVALID);
        }

        return disputeBanThreshold;
    }

    private LocalTime normalizeDailyMaintenanceTime(LocalTime dailyMaintenanceTime) {
        if (dailyMaintenanceTime == null) {
            throw new AppException(ErrorCode.DAILY_MAINTENANCE_TIME_INVALID);
        }
        // Bỏ phần nano-giây (nếu client gửi lên) — chỉ giữ độ chính xác tới giây.
        return dailyMaintenanceTime.withNano(0);
    }

    private String normalizeAnnouncement(String announcementBanner) {
        if (!StringUtils.hasText(announcementBanner)) {
            return null;
        }
        return announcementBanner.trim();
    }
}
