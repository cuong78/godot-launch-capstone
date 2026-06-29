package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.MediaContentFlagResponse;
import com.godotlaunch.backend.entity.MediaContentFlag;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.repository.MediaContentFlagRepository;
import com.godotlaunch.backend.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/content-flags")
@PreAuthorize("hasRole('admin')")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Admin Content Moderation", description = "Quản lý AI content flags — kiểm duyệt media NSFW")
public class AdminContentModerationController {

    private final MediaContentFlagRepository flagRepository;
    private final UserRepository userRepository;

    @GetMapping
    @Operation(summary = "Danh sách content flags", description = "Filter theo status, ownerType, chỉ flagged, hoặc search text")
    public ResponseEntity<ApiResponse<Object>> listFlags(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String ownerType,
            @RequestParam(defaultValue = "false") boolean onlyFlagged,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<MediaContentFlag> flags = flagRepository.search(
                status, ownerType, onlyFlagged, search,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));

        Page<MediaContentFlagResponse> response = flags.map(this::toResponse);
        return ResponseEntity.ok(ApiResponse.success(response, "OK"));
    }

    @GetMapping("/stats")
    @Operation(summary = "Thống kê nhanh", description = "Số lượng theo từng status")
    public ResponseEntity<ApiResponse<Object>> stats() {
        Map<String, Long> counts = Map.of(
                "pending", flagRepository.countByStatus("pending"),
                "approved", flagRepository.countByStatus("approved"),
                "removed", flagRepository.countByStatus("removed"),
                "warned", flagRepository.countByStatus("warned"),
                "total", flagRepository.count()
        );
        return ResponseEntity.ok(ApiResponse.success(counts, "OK"));
    }

    @PostMapping("/{id}/approve")
    @Operation(summary = "Approve — content sạch (false positive)")
    public ResponseEntity<ApiResponse<Object>> approve(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal UserDetails principal) {
        return updateFlag(id, "approved", body, principal);
    }

    @PostMapping("/{id}/remove")
    @Operation(summary = "Remove — xóa media vi phạm (chỉ cập nhật trạng thái)")
    public ResponseEntity<ApiResponse<Object>> remove(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal UserDetails principal) {
        return updateFlag(id, "removed", body, principal);
    }

    @PostMapping("/{id}/warn")
    @Operation(summary = "Warn — cảnh báo developer, giữ nội dung")
    public ResponseEntity<ApiResponse<Object>> warn(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal UserDetails principal) {
        return updateFlag(id, "warned", body, principal);
    }

    // --- helpers ---

    private ResponseEntity<ApiResponse<Object>> updateFlag(UUID id, String newStatus,
                                                            Map<String, String> body,
                                                            UserDetails principal) {
        MediaContentFlag flag = flagRepository.findById(id)
                .orElse(null);
        if (flag == null) {
            return ResponseEntity.ok(ApiResponse.error(404, "Content flag không tồn tại"));
        }

        flag.setStatus(newStatus);
        flag.setReviewedAt(Instant.now());
        if (body != null && body.containsKey("note")) {
            flag.setReviewerNote(body.get("note"));
        }

        User reviewer = userRepository.findByEmail(principal.getUsername()).orElse(null);
        flag.setReviewedBy(reviewer);
        flagRepository.save(flag);

        log.info("Admin {} đã {} content flag {} ({})", principal.getUsername(), newStatus, id, flag.getMediaUrl());
        return ResponseEntity.ok(ApiResponse.success(toResponse(flag), "Đã cập nhật"));
    }

    private MediaContentFlagResponse toResponse(MediaContentFlag f) {
        return MediaContentFlagResponse.builder()
                .id(f.getId())
                .mediaUrl(f.getMediaUrl())
                .mediaType(f.getMediaType())
                .ownerType(f.getOwnerType())
                .ownerId(f.getOwnerId())
                .ownerName(f.getOwnerName())
                .nsfwScore(f.getNsfwScore())
                .flagged(f.isFlagged())
                .flagDetails(f.getFlagDetails())
                .status(f.getStatus())
                .reviewerNote(f.getReviewerNote())
                .reviewedAt(f.getReviewedAt())
                .createdAt(f.getCreatedAt())
                .build();
    }
}
