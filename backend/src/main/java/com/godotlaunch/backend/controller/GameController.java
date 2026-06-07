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
}
