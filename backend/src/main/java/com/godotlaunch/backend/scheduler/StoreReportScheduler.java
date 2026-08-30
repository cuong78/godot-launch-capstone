package com.godotlaunch.backend.scheduler;

import com.godotlaunch.backend.service.StoreReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class StoreReportScheduler {

    private final StoreReportService storeReportService;

    /**
     * Chạy tự động hàng ngày (mặc định 02:00 AM) để đồng bộ report CSV từ Google Play Mock container.
     */
    @Scheduled(cron = "${app.google-play.sync-cron:0 0 2 * * ?}")
    public void scheduleDailyDownloadSync() {
        log.info("[MOCK SCHEDULER] Triggering daily Google Play install report sync...");
        try {
            storeReportService.syncAllActiveGamesDownloads();
        } catch (Exception e) {
            log.error("[MOCK SCHEDULER] Error during daily install report sync: {}", e.getMessage());
        }
    }
}
