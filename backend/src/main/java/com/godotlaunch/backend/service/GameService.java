//package com.godotlaunch.backend.service;
//
//import com.godotlaunch.backend.dto.request.CreateGameRequest;
//import com.godotlaunch.backend.dto.request.UpdateGameRequest;
//import com.godotlaunch.backend.dto.response.GameResponse;
//import com.godotlaunch.backend.entity.enums.GameStatus;
//import java.util.List;
//import java.util.UUID;
//
//public interface GameService {
//    UUID createGameDraft(CreateGameRequest request, String creatorEmail);
//    GameResponse getGameById(UUID gameId);
//    List<GameResponse> getAllGames();
//    List<GameResponse> getGamesByStatus(GameStatus status);
//    GameResponse updateGame(UUID gameId, UpdateGameRequest request, String updaterEmail);
//    String getPresignedUploadUrl(UUID gameId, String fileType, String contentType);
//    void confirmUploadComplete(UUID gameId, String fileType);
//    void approveGame(UUID gameId);
//    void rejectGame(UUID gameId, String reason);
//}
