//package com.godotlaunch.backend.controller;
//
//import com.godotlaunch.backend.dto.request.CreateGameRequest;
//import com.godotlaunch.backend.dto.request.UpdateGameRequest;
//import com.godotlaunch.backend.dto.response.ApiResponse;
//import com.godotlaunch.backend.dto.response.GameResponse;
//import com.godotlaunch.backend.entity.enums.GameStatus;
//import com.godotlaunch.backend.service.GameService;
//import jakarta.validation.Valid;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.*;
//
//import java.security.Principal;
//import java.util.List;
//import java.util.Map;
//import java.util.UUID;
//
//@RestController
//@RequestMapping("/api/v1/games")
//public class GameController {
//
//    private final GameService gameService;
//
//    public GameController(GameService gameService) {
//        this.gameService = gameService;
//    }
//
//    @PostMapping
//    public ResponseEntity<ApiResponse<Map<String, UUID>>> createGameDraft(
//            @Valid @RequestBody CreateGameRequest request,
//            Principal principal) {
//        String creatorEmail = principal.getName();
//        UUID gameId = gameService.createGameDraft(request, creatorEmail);
//        return ResponseEntity.ok(ApiResponse.success(Map.of("gameId", gameId), "Game draft created successfully"));
//    }
//
//    @GetMapping
//    public ResponseEntity<ApiResponse<List<GameResponse>>> getAllGames(
//            @RequestParam(required = false) GameStatus status) {
//        List<GameResponse> games;
//        if (status != null) {
//            games = gameService.getGamesByStatus(status);
//        } else {
//            games = gameService.getAllGames();
//        }
//        return ResponseEntity.ok(ApiResponse.success(games, "Games retrieved successfully"));
//    }
//
//    @GetMapping("/{id}")
//    public ResponseEntity<ApiResponse<GameResponse>> getGameById(@PathVariable UUID id) {
//        GameResponse game = gameService.getGameById(id);
//        return ResponseEntity.ok(ApiResponse.success(game, "Game retrieved successfully"));
//    }
//
//    @PutMapping("/{id}")
//    public ResponseEntity<ApiResponse<GameResponse>> updateGame(
//            @PathVariable UUID id,
//            @Valid @RequestBody UpdateGameRequest request,
//            Principal principal) {
//        String updaterEmail = principal.getName();
//        GameResponse updatedGame = gameService.updateGame(id, request, updaterEmail);
//        return ResponseEntity.ok(ApiResponse.success(updatedGame, "Game updated successfully"));
//    }
//
//    @GetMapping("/{id}/upload-url")
//    public ResponseEntity<ApiResponse<Map<String, String>>> getUploadUrl(
//            @PathVariable UUID id,
//            @RequestParam(defaultValue = "game") String fileType,
//            @RequestParam(defaultValue = "application/zip") String contentType) {
//
//        String url = gameService.getPresignedUploadUrl(id, fileType, contentType);
//        return ResponseEntity.ok(ApiResponse.success(Map.of("uploadUrl", url), "Presigned URL generated successfully"));
//    }
//
//    @PostMapping("/{id}/upload-complete")
//    public ResponseEntity<ApiResponse<Map<String, String>>> confirmUploadComplete(
//            @PathVariable UUID id,
//            @RequestParam(defaultValue = "game") String fileType) {
//
//        gameService.confirmUploadComplete(id, fileType);
//        String msg = "thumbnail".equalsIgnoreCase(fileType)
//                ? "Thumbnail uploaded successfully"
//                : "Game upload confirmed and virus scan started";
//
//        return ResponseEntity.ok(ApiResponse.success(Map.of("message", msg), "Success"));
//    }
//}
