package com.godotlaunch.backend.service;

import jakarta.servlet.http.HttpSession;

public interface GitHubOAuthService {
    String buildAuthorizationUrl(HttpSession session);
    String handleCallback(String code, String state, HttpSession session);
    String prepareLinkSession(String email, HttpSession session);
}
