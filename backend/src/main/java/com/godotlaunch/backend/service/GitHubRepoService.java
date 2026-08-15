package com.godotlaunch.backend.service;

import com.godotlaunch.backend.entity.User;

/**
 * Quản lý truy cập repo GitHub cho publish (mô hình bot/machine user).
 *
 * Public repo  → clone thẳng (không token).
 * Private repo → developer mời bot (godotlaunch-bot) làm collaborator
 *                → bot tự accept invitation qua API → clone bằng bot token.
 */
public interface GitHubRepoService {

    /** Trạng thái truy cập repo. */
    enum RepoAccess {
        PUBLIC,            // repo public — clone thẳng được
        PRIVATE_GRANTED,   // private nhưng bot đã có quyền (đã accept invite)
        PRIVATE_NO_ACCESS, // private, bot chưa được mời / chưa accept → cần mời bot
        NOT_FOUND          // repo không tồn tại / sai link
    }

    /**
     * Verify repo thuộc về user (owner khớp github_username + không phải fork).
     * Throw AppException nếu không hợp lệ.
     */
    void verifyOwnership(User user, String repoUrl);

    /**
     * Kiểm tra mức truy cập repo hiện tại của hệ thống (bot).
     */
    RepoAccess checkAccess(String repoUrl);

    /**
     * Bot poll + accept pending invitation cho repo này (nếu user vừa mời).
     * @return true nếu accept thành công (hoặc đã là collaborator)
     */
    boolean acceptBotInvitation(String repoUrl);

    /**
     * Token để clone repo: null nếu public, bot token nếu private (đã có quyền).
     */
    String getCloneToken(String repoUrl);

    /** Username bot để hiển thị hướng dẫn mời. */
    String getBotUsername();

    /** Lấy dữ liệu metadata thô của repository từ GitHub API (created_at, pushed_at, owner...) */
    java.util.Map<String, Object> getRepoMetadata(String repoUrl);
}
