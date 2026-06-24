package com.godotlaunch.backend.service;

import com.godotlaunch.backend.entity.User;

/**
 * Verify ownership repo GitHub + cung cấp token để clone.
 * Tách khỏi GitHubOAuthService (login) — service này lo phần repo cho publish.
 */
public interface GitHubRepoService {

    /**
     * Verify repo thuộc về user (owner khớp github_username + không phải fork).
     * Throw AppException nếu không hợp lệ.
     * @return commit/branch metadata cơ bản (không bắt buộc dùng)
     */
    void verifyOwnership(User user, String repoUrl);

    /**
     * Lấy OAuth token đã giải mã của user để clone private repo.
     * @return plaintext token, hoặc null nếu user chưa link GitHub
     */
    String getDecryptedToken(User user);
}
