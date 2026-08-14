package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.CreateGameRequest;
import com.godotlaunch.backend.dto.request.SubmitGameRepoRequest;
import com.godotlaunch.backend.dto.request.UpdateGameRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.GameResponse;
import com.godotlaunch.backend.entity.enums.GameStatus;
import com.godotlaunch.backend.service.GameService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.HandlerMapping;

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
    @PreAuthorize("hasRole('DEVELOPER')")
    @Operation(summary = "Create game draft", description = "Initializes a game submission record in draft status.")
    public ResponseEntity<ApiResponse<Map<String, UUID>>> createGameDraft(
            @Valid @RequestBody CreateGameRequest request,
            Principal principal) {
        String creatorEmail = principal.getName();
        UUID gameId = gameService.createGameDraft(request, creatorEmail);
        return ResponseEntity.ok(ApiResponse.success(Map.of("gameId", gameId), "Game draft created successfully"));
    }

    @PostMapping("/{id}/submit-repo")
    @PreAuthorize("hasRole('DEVELOPER')")
    @Operation(summary = "Submit game bằng repo GitHub",
            description = "Verify owner repo → clone → virus scan → snapshot. Thay cho upload game.zip. Private chưa cấp quyền → 403 REPO_NEEDS_BOT.")
    public ResponseEntity<ApiResponse<Map<String, String>>> submitGameRepo(
            @PathVariable UUID id,
            @Valid @RequestBody SubmitGameRepoRequest request,
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
    @PreAuthorize("hasRole('DEVELOPER')")
    @Operation(summary = "Bot accept invitation repo private",
            description = "Sau khi developer mời bot vào repo, bot tự accept invitation. Trả granted=true nếu sẵn sàng submit.")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> acceptBot(
            @Valid @RequestBody SubmitGameRepoRequest request,
            Principal principal) {
        boolean granted = gameService.acceptBotInvitation(request.getRepoUrl(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("granted", granted),
                granted ? "Đã cấp quyền cho bot. Bạn có thể submit lại." : "Chưa tìm thấy lời mời. Vui lòng kiểm tra lại."));
    }

    @GetMapping
    @Operation(summary = "Get all games", description = "Retrieves all game drafts, submissions, or published games (optionally filtered by status and search keyword).")
    public ResponseEntity<ApiResponse<List<GameResponse>>> getAllGames(
            @RequestParam(required = false) GameStatus status,
            @RequestParam(required = false) String search) {
        List<GameResponse> games = gameService.getAllGames(status, search);
        return ResponseEntity.ok(ApiResponse.success(games, "Games retrieved successfully"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get game by ID", description = "Retrieves details of a specific game submission.")
    public ResponseEntity<ApiResponse<GameResponse>> getGameById(@PathVariable UUID id) {
        GameResponse game = gameService.getGameById(id);
        return ResponseEntity.ok(ApiResponse.success(game, "Game retrieved successfully"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('DEVELOPER')")
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
    @PreAuthorize("hasRole('DEVELOPER')")
    @Operation(summary = "Request SeaweedFS upload URL", description = "Generates a SeaweedFS upload link for file upload (thumbnail, screenshot, video, or game.zip).")
    public ResponseEntity<ApiResponse<Map<String, String>>> getUploadUrl(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "game") String fileType,
            @RequestParam(defaultValue = "application/zip") String contentType,
            Principal principal) {

        String url = gameService.getPresignedUploadUrl(id, fileType, contentType, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(Map.of("uploadUrl", url), "Presigned URL generated successfully"));
    }

    @PostMapping("/{id}/upload-complete")
    @PreAuthorize("hasRole('DEVELOPER')")
    @Operation(summary = "Confirm upload complete", description = "Signals that the file has been successfully uploaded to storage. For game files, triggers asynchronous security verification.")
    public ResponseEntity<ApiResponse<Map<String, String>>> confirmUploadComplete(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "game") String fileType,
            @RequestParam(required = false) String objectKey,
            Principal principal) {

        gameService.confirmUploadComplete(id, fileType, objectKey, principal.getName());
        String msg = "thumbnail".equalsIgnoreCase(fileType)
                ? "Thumbnail uploaded successfully"
                : ("screenshot".equalsIgnoreCase(fileType) || "image".equalsIgnoreCase(fileType) || "video".equalsIgnoreCase(fileType)
                    ? "Media uploaded successfully"
                    : "Game upload confirmed and virus scan started");

        return ResponseEntity.ok(ApiResponse.success(Map.of("message", msg), "Success"));
    }

    @PostMapping(value = "/{id}/media/upload", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('DEVELOPER')")
    @Operation(summary = "Upload media qua proxy", description = "Upload thumbnail/screenshot/video qua backend → SeaweedFsService. Thay cho upload trực tiếp.")
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
    @PreAuthorize("hasRole('DEVELOPER')")
    @Operation(summary = "Xóa media theo loại", description = "Xóa toàn bộ screenshot ('image') hoặc video ('video') của game — dùng khi cập nhật bộ ảnh mới cho version mới.")
    public ResponseEntity<ApiResponse<Map<String, String>>> clearGameMedia(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "image") String mediaType,
            Principal principal) {

        gameService.clearGameMedia(id, mediaType, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "Media cleared successfully"), "Success"));
    }

    @DeleteMapping("/{id}/media/item")
    @PreAuthorize("hasRole('DEVELOPER')")
    @Operation(summary = "Xóa 1 media cụ thể", description = "Xóa 1 screenshot/video theo mediaUrl — dùng khi developer gỡ 1 ảnh lẻ khỏi danh sách.")
    public ResponseEntity<ApiResponse<Map<String, String>>> deleteGameMediaItem(
            @PathVariable UUID id,
            @RequestParam String mediaUrl,
            Principal principal) {

        gameService.deleteGameMediaByUrl(id, mediaUrl, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "Media item deleted successfully"), "Success"));
    }

    @PostMapping(value = "/{id}/web-demo", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('DEVELOPER')")
    @Operation(summary = "Upload Game Web Demo", description = "Upload bản Web export (.zip) của game để chơi thử. Giải nén tĩnh lên SeaweedFS.")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadWebDemo(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file,
            Principal principal) {
        gameService.uploadWebDemo(id, file, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("message", "Web demo uploaded and activated successfully"), "Success"));
    }

    @GetMapping("/{id}/web-demo/**")
    @Operation(summary = "Proxy phục vụ file Web Demo", description = "Stream file demo (html/js/wasm/pck) qua backend " +
            "kèm header Cross-Origin-Isolation (COOP/COEP) để Godot Web export chạy đa luồng đúng chuẩn. Yêu cầu đăng nhập.")
    public void serveWebDemo(@PathVariable UUID id, HttpServletRequest request, HttpServletResponse response) throws java.io.IOException {
        String path = (String) request.getAttribute(HandlerMapping.PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE);
        String bestMatchPattern = (String) request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        String rawRelativePath = new AntPathMatcher().extractPathWithinPattern(bestMatchPattern, path);
        // path lấy từ PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE vẫn giữ nguyên %-encoding gốc trên URL -> phải decode
        // thủ công trước khi dùng làm tên file, nếu không sẽ bị encode chồng lần nữa lúc gọi SeaweedFS (vd: "%20" -> "%2520").
        String relativePath = org.springframework.web.util.UriUtils.decode(rawRelativePath, java.nio.charset.StandardCharsets.UTF_8);
        gameService.streamWebDemoFile(id, relativePath, response);
    }

    @GetMapping("/template")
    @Operation(summary = "Download game folder structure template zip file")
    public ResponseEntity<org.springframework.core.io.Resource> downloadTemplate() {
        org.springframework.core.io.Resource resource = new org.springframework.core.io.ClassPathResource("static/templates/game_template.zip");
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"game_template.zip\"")
                .contentType(org.springframework.http.MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }

    @PostMapping(value = "/{id}/upload-unified", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('DEVELOPER')")
    @Operation(summary = "Upload unified zip containing game description media and playable web demo")
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadUnifiedGame(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file,
            Principal principal) {
        gameService.startUnifiedGameUpload(id, file, principal.getName());
        return ResponseEntity.accepted().body(ApiResponse.success(
                Map.of("gameId", id, "status", "PROCESSING"),
                "File has been uploaded successfully and is being processed in the background."
        ));
    }

    @GetMapping("/{id}/upload-status")
    @PreAuthorize("hasRole('DEVELOPER')")
    @Operation(summary = "Get progress of the background unified zip processing")
    public ResponseEntity<ApiResponse<GameResponse>> getUploadStatus(
            @PathVariable UUID id,
            Principal principal) {
        GameResponse response = gameService.getUploadStatus(id, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Upload status retrieved successfully"));
    }

    @PutMapping("/{id}/reorder-screenshots")
    @PreAuthorize("hasRole('DEVELOPER')")
    @Operation(summary = "Update the display sequence of game screenshots")
    public ResponseEntity<ApiResponse<Map<String, String>>> reorderScreenshots(
            @PathVariable UUID id,
            @RequestBody List<String> orderedUrls,
            Principal principal) {
        gameService.reorderScreenshots(id, orderedUrls, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "Screenshots reordered successfully"), "Success"));
    }
}
