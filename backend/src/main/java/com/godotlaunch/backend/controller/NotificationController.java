package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.NotificationResponse;
import com.godotlaunch.backend.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "Notification API", description = "Endpoints for user notifications retrieval and management")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @Operation(summary = "Get my notifications", description = "Retrieves all notifications for the currently logged-in user.")
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> getMyNotifications(Principal principal) {
        String email = principal.getName();
        List<NotificationResponse> list = notificationService.getMyNotifications(email);
        return ResponseEntity.ok(ApiResponse.success(list, "Notifications retrieved successfully."));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Get unread count", description = "Retrieves count of unread notifications.")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(Principal principal) {
        String email = principal.getName();
        long count = notificationService.getUnreadCount(email);
        return ResponseEntity.ok(ApiResponse.success(count, "Unread count retrieved successfully."));
    }

    @PutMapping("/{id}/read")
    @Operation(summary = "Mark a notification as read", description = "Marks a specific notification as read.")
    public ResponseEntity<ApiResponse<Void>> markAsRead(Principal principal, @PathVariable UUID id) {
        String email = principal.getName();
        notificationService.markAsRead(id, email);
        return ResponseEntity.ok(ApiResponse.success(null, "Notification marked as read."));
    }

    @PutMapping("/read-all")
    @Operation(summary = "Mark all notifications as read", description = "Marks all user notifications as read.")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(Principal principal) {
        String email = principal.getName();
        notificationService.markAllAsRead(email);
        return ResponseEntity.ok(ApiResponse.success(null, "All notifications marked as read."));
    }
}
