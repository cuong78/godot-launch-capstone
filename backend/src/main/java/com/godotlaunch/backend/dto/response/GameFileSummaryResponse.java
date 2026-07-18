package com.godotlaunch.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/** 1 dòng trong danh sách Game (category "game" của Storage Management). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameFileSummaryResponse {
    private UUID id;
    private String title;
    private String thumbnailUrl;
    private String publishingType; // full_acquisition | co_publishing | marketplace_listing
    private String status;
    private String creatorName;
    private int fileCount; // thumbnail (nếu có) + số lượng SourceSnapshot
    private Instant createdAt;
}
