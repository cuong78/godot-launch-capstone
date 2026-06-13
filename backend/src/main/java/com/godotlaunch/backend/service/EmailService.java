package com.godotlaunch.backend.service;

public interface EmailService {
    void sendGameStatusNotification(String to, String gameTitle, String status, String reason);
    void sendMarketplaceItemStatusNotification(String to, String itemTitle, String status, String reason);
    void sendOtpEmail(String to, String otp);
}
