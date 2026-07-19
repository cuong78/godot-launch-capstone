package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.TagResponse;
import com.godotlaunch.backend.dto.request.TagRequest;
import com.godotlaunch.backend.service.TagService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tags")
@RequiredArgsConstructor
@Tag(name = "Tag API", description = "Danh sách tag cho game / marketplace item")
public class TagController {

    private final TagService tagService;

    @GetMapping
    @Operation(summary = "Lấy tất cả tags", description = "Dùng cho dropdown chọn tag khi upload game/asset.")
    public ResponseEntity<ApiResponse<List<TagResponse>>> getAllTags() {
        return ResponseEntity.ok(ApiResponse.success(tagService.getAll(), "Tags retrieved successfully"));
    }

    @GetMapping("/search")
    @Operation(summary = "Tìm kiếm tags", description = "Trả tối đa 20 tag phù hợp cho ô chọn tag khi upload game/asset.")
    public ResponseEntity<ApiResponse<List<TagResponse>>> searchTags(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "12") int limit) {
        return ResponseEntity.ok(ApiResponse.success(tagService.search(q, limit), "Tags retrieved successfully"));
    }

    @PostMapping @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<TagResponse>> create(@Valid @RequestBody TagRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(tagService.create(request), "Tag created successfully"));
    }

    @PutMapping("/{id}") @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<TagResponse>> update(@PathVariable UUID id, @Valid @RequestBody TagRequest request) {
        return ResponseEntity.ok(ApiResponse.success(tagService.update(id, request), "Tag updated successfully"));
    }

    @DeleteMapping("/{id}") @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        tagService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Tag deleted successfully"));
    }
}
