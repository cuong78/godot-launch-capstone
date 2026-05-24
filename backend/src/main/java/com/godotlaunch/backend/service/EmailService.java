package com.godotlaunch.backend.service;

public interface EmailService {
    void sendGameStatusNotification(String to, String gameTitle, String status, String reason);
}
