package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.CreateGameRequest;
import com.godotlaunch.backend.dto.request.UpdateGameRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.GameResponse;
import com.godotlaunch.backend.entity.enums.GameStatus;
import com.godotlaunch.backend.service.GameService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/games")
@RequiredArgsConstructor
@Tag(name = "Game Publishing API", description = "Endpoints for managing game submissions, unzipping verification, and publishing")
public class GameController {

    private final GameService gameService;

    @PostMapping
    @Operation(summary = "Create game draft", description = "Initializes a game submission record in draft status.")
    public ResponseEntity<ApiResponse<Map<String, UUID>>> createGameDraft(
            @Valid @RequestBody CreateGameRequest request,
            Principal principal) {
        String creatorEmail = principal.getName();
        UUID gameId = gameService.createGameDraft(request, creatorEmail);
        return ResponseEntity.ok(ApiResponse.success(Map.of("gameId", gameId), "Game draft created successfully"));
    }

    @PostMapping("/{id}/submit-repo")
    @Operation(summary = "Submit game bằng repo GitHub",
            description = "Verify owner repo → clone → virus scan → snapshot. Thay cho upload game.zip. Private chưa cấp quyền → 403 REPO_NEEDS_BOT.")
    public ResponseEntity<ApiResponse<Map<String, String>>> submitGameRepo(
            @PathVariable UUID id,
            @Valid @RequestBody com.godotlaunch.backend.dto.request.SubmitGameRepoRequest request,
            Principal principal) {
        gameService.submitGameRepo(id, request.getRepoUrl(), request.getBranch(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("message", "Repo verified và submit thành công. Đang chờ duyệt."), "Success"));
    }

    @GetMapping("/github-bot")
    @Operation(summary = "Lấy username bot GitHub", description = "Username để developer mời bot vào repo private.")
    public ResponseEntity<ApiResponse<Map<String, String>>> getGithubBot() {
        String bot = gameService.getBotUsername();
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("botUsername", bot != null ? bot : ""), "OK"));
    }

    @PostMapping("/accept-bot")
    @Operation(summary = "Bot accept invitation repo private",
            description = "Sau khi developer mời bot vào repo, bot tự accept invitation. Trả granted=true nếu sẵn sàng submit.")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> acceptBot(
            @Valid @RequestBody com.godotlaunch.backend.dto.request.SubmitGameRepoRequest request,
            Principal principal) {
        boolean granted = gameService.acceptBotInvitation(request.getRepoUrl(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("granted", granted),
                granted ? "Đã cấp quyền cho bot. Bạn có thể submit lại." : "Chưa tìm thấy lời mời. Vui lòng kiểm tra lại."));
    }

    @GetMapping
    @Operation(summary = "Get all games", description = "Retrieves all game drafts, submissions, or published games (optionally filtered by status).")
    public ResponseEntity<ApiResponse<List<GameResponse>>> getAllGames(
            @RequestParam(required = false) GameStatus status) {
        List<GameResponse> games;
        if (status != null) {
            games = gameService.getGamesByStatus(status);
        } else {
            games = gameService.getAllGames();
        }
        return ResponseEntity.ok(ApiResponse.success(games, "Games retrieved successfully"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get game by ID", description = "Retrieves details of a specific game submission.")
    public ResponseEntity<ApiResponse<GameResponse>> getGameById(@PathVariable UUID id) {
        GameResponse game = gameService.getGameById(id);
        return ResponseEntity.ok(ApiResponse.success(game, "Game retrieved successfully"));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update game information", description = "Updates metadata parameters for a game submission draft.")
    public ResponseEntity<ApiResponse<GameResponse>> updateGame(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateGameRequest request,
            Principal principal) {
        String updaterEmail = principal.getName();
        GameResponse updatedGame = gameService.updateGame(id, request, updaterEmail);
        return ResponseEntity.ok(ApiResponse.success(updatedGame, "Game updated successfully"));
    }

    @GetMapping("/{id}/upload-url")
    @Operation(summary = "Request S3 presigned upload URL", description = "Generates a secure S3 PUT upload link for file upload (thumbnail, screenshot, video, or game.zip).")
    public ResponseEntity<ApiResponse<Map<String, String>>> getUploadUrl(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "game") String fileType,
            @RequestParam(defaultValue = "application/zip") String contentType) {

        String url = gameService.getPresignedUploadUrl(id, fileType, contentType);
        return ResponseEntity.ok(ApiResponse.success(Map.of("uploadUrl", url), "Presigned URL generated successfully"));
    }

    @PostMapping("/{id}/upload-complete")
    @Operation(summary = "Confirm upload complete", description = "Signals that the file has been successfully uploaded to S3. For game files, triggers asynchronous security verification.")
    public ResponseEntity<ApiResponse<Map<String, String>>> confirmUploadComplete(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "game") String fileType,
            @RequestParam(required = false) String objectKey) {

        gameService.confirmUploadComplete(id, fileType, objectKey);
        String msg = "thumbnail".equalsIgnoreCase(fileType)
                ? "Thumbnail uploaded successfully"
                : ("screenshot".equalsIgnoreCase(fileType) || "image".equalsIgnoreCase(fileType) || "video".equalsIgnoreCase(fileType)
                    ? "Media uploaded successfully"
                    : "Game upload confirmed and virus scan started");

        return ResponseEntity.ok(ApiResponse.success(Map.of("message", msg), "Success"));
    }

    @PostMapping(value = "/{id}/media/upload", consumes = "multipart/form-data")
    @Operation(summary = "Upload media qua proxy", description = "Upload thumbnail/screenshot/video qua backend → StorageRouter (route đúng S3/SeaweedFS theo config). Thay cho presigned URL.")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadGameMedia(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "screenshot") String fileType,
            Principal principal) {
        String objectKey = gameService.uploadGameMedia(id, fileType, file, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("message", "Media uploaded successfully", "objectKey", objectKey), "Success"));
    }

    @DeleteMapping("/{id}/media")
    @Operation(summary = "Xóa media theo loại", description = "Xóa toàn bộ screenshot ('image') hoặc video ('video') của game — dùng khi cập nhật bộ ảnh mới cho version mới.")
    public ResponseEntity<ApiResponse<Map<String, String>>> clearGameMedia(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "image") String mediaType,
            Principal principal) {

        gameService.clearGameMedia(id, mediaType, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "Media cleared successfully"), "Success"));
    }

    @DeleteMapping("/{id}/media/item")
    @Operation(summary = "Xóa 1 media cụ thể", description = "Xóa 1 screenshot/video theo mediaUrl — dùng khi developer gỡ 1 ảnh lẻ khỏi danh sách.")
    public ResponseEntity<ApiResponse<Map<String, String>>> deleteGameMediaItem(
            @PathVariable UUID id,
            @RequestParam String mediaUrl,
            Principal principal) {

        gameService.deleteGameMediaByUrl(id, mediaUrl, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "Media item deleted successfully"), "Success"));
    }
}
