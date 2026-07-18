package com.godotlaunch.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/** 1 dòng trong danh sách Asset (category "asset" của Storage Management). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssetFileSummaryResponse {
    private UUID id;
    private String title;
    private String thumbnailUrl;
    private String status;
    private String sellerName;
    private int fileCount; // thumbnail (nếu có) + file chính (nếu có)
    private Instant createdAt;
}
