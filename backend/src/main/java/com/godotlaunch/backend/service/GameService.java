package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.request.CreateGameRequest;
import com.godotlaunch.backend.dto.request.UpdateGameRequest;
import com.godotlaunch.backend.dto.response.GameResponse;
import com.godotlaunch.backend.entity.enums.GameStatus;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface GameService {
    UUID createGameDraft(CreateGameRequest request, String creatorEmail);
    GameResponse getGameById(UUID gameId);
    List<GameResponse> getAllGames();
    List<GameResponse> getGamesByStatus(GameStatus status);
    GameResponse updateGame(UUID gameId, UpdateGameRequest request, String updaterEmail);
    String getPresignedUploadUrl(UUID gameId, String fileType, String contentType);
    void confirmUploadComplete(UUID gameId, String fileType, String objectKey);

    /**
     * Proxy upload media (thumbnail/screenshot/video) qua StorageRouter — tôn trọng routing config.
     * Thay cho presigned URL vì SeaweedFS không hỗ trợ presigned.
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
}
