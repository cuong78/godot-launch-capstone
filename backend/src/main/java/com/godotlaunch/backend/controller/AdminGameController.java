//package com.godotlaunch.backend.controller;
//
//import com.godotlaunch.backend.dto.response.ApiResponse;
//import com.godotlaunch.backend.service.GameService;
//import org.springframework.http.ResponseEntity;
//import org.springframework.security.access.prepost.PreAuthorize;
//import org.springframework.web.bind.annotation.*;
//
//import java.util.Map;
//import java.util.UUID;
//
//@RestController
//@RequestMapping("/api/v1/admin/games")
//@PreAuthorize("hasAuthority('ROLE_ADMIN')")
//public class AdminGameController {
//
//    private final GameService gameService;
//
//    public AdminGameController(GameService gameService) {
//        this.gameService = gameService;
//    }
//
//    @PostMapping("/{id}/approve")
//    public ResponseEntity<ApiResponse<Void>> approveGame(@PathVariable UUID id) {
//        gameService.approveGame(id);
//        return ResponseEntity.ok(ApiResponse.success(null, "Game approved and published successfully"));
//    }
//
//    @PostMapping("/{id}/reject")
//    public ResponseEntity<ApiResponse<Void>> rejectGame(@PathVariable UUID id, @RequestBody Map<String, String> request) {
//        String reason = request.getOrDefault("reason", "Violated store policies");
//        gameService.rejectGame(id, reason);
//        return ResponseEntity.ok(ApiResponse.success(null, "Game rejected successfully"));
//    }
//}
