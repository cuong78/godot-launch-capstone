package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.request.CreateGameRequest;
import com.godotlaunch.backend.dto.request.UpdateGameRequest;
import com.godotlaunch.backend.dto.response.GameResponse;
import com.godotlaunch.backend.entity.enums.GameStatus;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

public interface GameService {
    UUID createGameDraft(CreateGameRequest request, String creatorEmail);

    /**
     * Submit game bằng repo GitHub: verify owner → clone → virus scan → snapshot.
     * Thay cho upload game.zip. Sạch → status pending, nhiễm → rejected.
     * Nếu private chưa cấp quyền bot → throw REPO_NEEDS_BOT.
     */
    void submitGameRepo(UUID gameId, String repoUrl, String branch, String creatorEmail);

    /**
     * Sau khi developer mời bot vào repo private: bot accept invitation.
     * @return true nếu bot đã có quyền truy cập (sẵn sàng submit lại)
     */
    boolean acceptBotInvitation(String repoUrl, String creatorEmail);

    /** Username bot để frontend hiển thị hướng dẫn mời. */
    String getBotUsername();
    GameResponse getGameById(UUID gameId);
    List<GameResponse> getAllGames();
    List<GameResponse> getGamesByStatus(GameStatus status);
    GameResponse updateGame(UUID gameId, UpdateGameRequest request, String updaterEmail);
    String getPresignedUploadUrl(UUID gameId, String fileType, String contentType);
    void confirmUploadComplete(UUID gameId, String fileType, String objectKey);

    /**
     * Proxy upload media (thumbnail/screenshot/video) qua SeaweedFsService.
     * Thay cho presigned URL.
     * @return objectKey của file vừa upload (để frontend track / xóa lẻ sau này)
     */
    String uploadGameMedia(UUID gameId, String fileType, MultipartFile file, String uploaderEmail);

    /**
     * Xóa toàn bộ media của 1 loại ("image" | "video") để thay bộ mới
     * khi developer cập nhật game lên version mới.
     */
    void clearGameMedia(UUID gameId, String mediaType, String updaterEmail);

    /**
     * Xóa 1 media cụ thể theo mediaUrl — dùng khi developer gỡ 1 screenshot lẻ.
     * Xóa cả record DB lẫn file trên storage.
     */
    void deleteGameMediaByUrl(UUID gameId, String mediaUrl, String updaterEmail);
    void approveGame(UUID gameId);
    void rejectGame(UUID gameId, String reason);
    void uploadWebDemo(UUID gameId, MultipartFile file, String creatorEmail);

    /**
     * Stream 1 file trong bản Web Demo (html/js/wasm/pck) qua backend thay vì thẳng từ SeaweedFS,
     * kèm header Cross-Origin-Isolation (COOP/COEP) để Godot Web export dùng Threads chạy đúng hiệu năng.
     * @param relativePath đường dẫn tương đối bên trong thư mục web_demo (VD: "{version}/index.html")
     */
    void streamWebDemoFile(UUID gameId, String relativePath, HttpServletResponse response) throws IOException;
}
