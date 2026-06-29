package com.godotlaunch.backend.dto.response;

import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UploadedFileResponse {
    private String id;
    private String fileName;
    private String fileType; // avatar, pdf_contract, game_media, asset_media, source_bundle
    private String fileUrl;
    private String storageProvider; // aws_s3, seaweedfs
    private UUID ownerId;
    private String ownerType; // User, Game, Asset, Contract, SourceSnapshot, ChatMedia
    private String ownerName; // Tên hiển thị của thực thể sở hữu (ví dụ: Full Name, Game Title)
    private Instant createdAt;
}
