package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.TagResponse;
import com.godotlaunch.backend.repository.TagRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tags")
@RequiredArgsConstructor
@Tag(name = "Tag API", description = "Danh sách tag cho game / marketplace item")
public class TagController {

    private final TagRepository tagRepository;

    @GetMapping
    @Operation(summary = "Lấy tất cả tags", description = "Dùng cho dropdown chọn tag khi upload game/asset.")
    public ResponseEntity<ApiResponse<List<TagResponse>>> getAllTags() {
        List<TagResponse> tags = tagRepository.findAllByOrderByNameAsc().stream()
                .map(t -> TagResponse.builder()
                        .id(t.getId())
                        .name(t.getName())
                        .slug(t.getSlug())
                        .build())
                .toList();
        return ResponseEntity.ok(ApiResponse.success(tags, "Tags retrieved successfully"));
    }
}
