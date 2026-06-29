package com.godotlaunch.backend.service;

import java.io.InputStream;
import java.util.UUID;

public interface DownloadService {
    DownloadResource downloadPurchase(UUID purchaseId, String requesterEmail, String ipAddress, String userAgent);

    record DownloadResource(InputStream inputStream, String fileName) {
    }
}
