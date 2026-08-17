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
     * Kiểm tra mức truy cập repo BẰNG CHỨNG trong dispute — KHÁC checkAccess()
     * vì không có bước verifyOwnership() đi trước (D chỉ dán URL, không đăng
     * ký sở hữu repo qua hệ thống). GitHub cố tình trả 404 giống hệt nhau
     * cho "repo không tồn tại" lẫn "private mà bot chưa có quyền" (thiết kế
     * bảo mật, không phải giới hạn kỹ thuật của code này — xem
     * docs/26-dispute-refund-scope-and-gaps-plan.md mục 4.1), nên vẫn không
     * phân biệt được 2 trường hợp — nhưng URL sai định dạng (không phải
     * github.com/owner/repo) được validate riêng, trả PARSE lỗi rõ ràng
     * thay vì lẫn vào PRIVATE_NO_ACCESS.
     */
    RepoAccess checkAccessForEvidence(String repoUrl);

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

    /** Lấy lịch sử commits gần nhất của repository từ GitHub API (nội dung commit, thời gian commit, tần suất) */
    java.util.List<java.util.Map<String, Object>> getRepoCommitsMetadata(String repoUrl);
}
