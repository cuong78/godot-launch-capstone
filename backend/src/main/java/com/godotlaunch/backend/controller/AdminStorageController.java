package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.UploadedFileResponse;
import com.godotlaunch.backend.dto.response.GameFileSummaryResponse;
import com.godotlaunch.backend.dto.response.GameFileDetailResponse;
import com.godotlaunch.backend.dto.response.AssetFileSummaryResponse;
import com.godotlaunch.backend.dto.response.AssetFileDetailResponse;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.AssetRepository;
import com.godotlaunch.backend.repository.MediaRepository;
import com.godotlaunch.backend.repository.ContractRepository;
import com.godotlaunch.backend.repository.SourceSnapshotRepository;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.Asset;
import com.godotlaunch.backend.entity.Media;
import com.godotlaunch.backend.entity.Contract;
import com.godotlaunch.backend.entity.SourceSnapshot;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.service.SeaweedFsService;
import java.util.ArrayList;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import java.io.InputStream;
import java.net.URL;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/storage")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Admin Storage API", description = "Quản lý tập tin lưu trữ hệ thống")
public class AdminStorageController {

    private final SeaweedFsService seaweedFsService;
    private final UserRepository userRepo;
    private final GameRepository gameRepo;
    private final AssetRepository itemRepo;
    private final MediaRepository mediaRepo;
    private final ContractRepository contractRepo;
    private final SourceSnapshotRepository snapshotRepo;

    // ── File Management ──────────────────────────────────────

    @GetMapping("/files")
    @Operation(summary = "Lấy danh sách file tải lên phân trang theo Category")
    @Transactional(readOnly = true)  // media.getGame()/getAsset() là LAZY proxy → cần session mở
    public ResponseEntity<ApiResponse<Page<UploadedFileResponse>>> listUploadedFiles(
            @RequestParam String category,
            @RequestParam(required = false, defaultValue = "") String search,
            @RequestParam(required = false) String mediaType,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "20") int size) {
        
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        String cleanSearch = search.trim();
        Page<UploadedFileResponse> resultPage;

        switch (category.toLowerCase()) {
            case "avatar" -> {
                Page<User> users = userRepo.searchAvatars(cleanSearch, pageable);
                resultPage = users.map(u -> UploadedFileResponse.builder()
                        .id("avatar-" + u.getId())
                        .fileName(extractFileName(u.getAvatarUrl()))
                        .fileType("avatar")
                        .fileUrl(seaweedFsService.resolvePublicUrl(u.getAvatarUrl()))
                        .storageProvider(inferProvider(u.getAvatarUrl()))
                        .ownerId(u.getId())
                        .ownerType("User")
                        .ownerName(u.getFullName() != null ? u.getFullName() : u.getEmail())
                        .createdAt(u.getCreatedAt())
                        .build());
            }
            case "game_thumbnail" -> {
                Page<Game> games = gameRepo.searchGameThumbnails(cleanSearch, pageable);
                resultPage = games.map(g -> UploadedFileResponse.builder()
                        .id("gamethumb-" + g.getId())
                        .fileName(extractFileName(g.getThumbnailUrl()))
                        .fileType("game_media")
                        .fileUrl(seaweedFsService.resolvePublicUrl(g.getThumbnailUrl()))
                        .storageProvider(inferProvider(g.getThumbnailUrl()))
                        .ownerId(g.getId())
                        .ownerType("Game")
                        .ownerName(g.getTitle())
                        .createdAt(g.getCreatedAt())
                        .build());
            }
            case "marketplace_zip" -> {
                Page<Asset> items = itemRepo.searchAssetZips(cleanSearch, pageable);
                resultPage = items.map(m -> UploadedFileResponse.builder()
                        .id("marketzip-" + m.getId())
                        .fileName(extractFileName(m.getFileUrl()))
                        .fileType("source_bundle")
                        .fileUrl(seaweedFsService.resolvePublicUrl(m.getFileUrl()))
                        .storageProvider(inferProvider(m.getFileUrl()))
                        .ownerId(m.getId())
                        .ownerType("Asset")
                        .ownerName(m.getTitle())
                        .createdAt(m.getCreatedAt())
                        .build());
            }
            case "marketplace_thumbnail" -> {
                Page<Asset> items = itemRepo.searchAssetThumbnails(cleanSearch, pageable);
                resultPage = items.map(m -> UploadedFileResponse.builder()
                        .id("marketthumb-" + m.getId())
                        .fileName(extractFileName(m.getThumbnailUrl()))
                        .fileType("asset_media")
                        .fileUrl(seaweedFsService.resolvePublicUrl(m.getThumbnailUrl()))
                        .storageProvider(inferProvider(m.getThumbnailUrl()))
                        .ownerId(m.getId())
                        .ownerType("Asset")
                        .ownerName(m.getTitle())
                        .createdAt(m.getCreatedAt())
                        .build());
            }
            case "media_file" -> {
                Page<Media> mediaList;
                if ("image".equalsIgnoreCase(mediaType)) {
                    mediaList = mediaRepo.searchMediaImages(cleanSearch, pageable);
                } else if ("video".equalsIgnoreCase(mediaType)) {
                    mediaList = mediaRepo.searchMediaVideos(cleanSearch, pageable);
                } else {
                    mediaList = mediaRepo.searchMedia(cleanSearch, pageable);
                }
                resultPage = mediaList.map(med -> {
                    String ownerName = "Unknown";
                    String ownerType = "Unknown";
                    if (med.getGame() != null) {
                        ownerName = med.getGame().getTitle();
                        ownerType = "Game";
                    } else if (med.getAsset() != null) {
                        ownerName = med.getAsset().getTitle();
                        ownerType = "Asset";
                    }
                    return UploadedFileResponse.builder()
                            .id("media-" + med.getId())
                            .fileName(extractFileName(med.getMediaUrl()))
                            .fileType(med.getGame() != null ? "game_media" : "asset_media")
                            .fileUrl(seaweedFsService.resolvePublicUrl(med.getMediaUrl()))
                            .storageProvider(inferProvider(med.getMediaUrl()))
                            .ownerId(med.getId())
                            .ownerType("Media")
                            .ownerName(ownerName + " (" + med.getMediaType() + ")")
                            .createdAt(med.getCreatedAt())
                            .build();
                });
            }
            case "contract_pdf" -> {
                Page<Contract> contracts = contractRepo.searchContracts(cleanSearch, pageable);
                resultPage = contracts.map(c -> {
                    String gameTitle = c.getGame() != null ? c.getGame().getTitle() : "Unknown Game";
                    return UploadedFileResponse.builder()
                            .id("contract-" + c.getId())
                            .fileName(extractFileName(c.getPdfUrl()))
                            .fileType("pdf_contract")
                            .fileUrl(seaweedFsService.resolvePublicUrl(c.getPdfUrl()))
                            .storageProvider(inferProvider(c.getPdfUrl()))
                            .ownerId(c.getId())
                            .ownerType("Contract")
                            .ownerName("HĐ: " + gameTitle)
                            .createdAt(c.getCreatedAt())
                            .build();
                });
            }
            case "source_snapshot" -> {
                Page<SourceSnapshot> snapshots = snapshotRepo.searchSnapshots(cleanSearch, pageable);
                resultPage = snapshots.map(s -> {
                    String gameTitle = s.getGame() != null ? s.getGame().getTitle() : "Unknown Game";
                    return UploadedFileResponse.builder()
                            .id("snapshot-" + s.getId())
                            .fileName(extractFileName(s.getBundleUrl()))
                            .fileType("source_bundle")
                            .fileUrl(seaweedFsService.resolvePublicUrl(s.getBundleUrl()))
                            .storageProvider(inferProvider(s.getBundleUrl()))
                            .ownerId(s.getId())
                            .ownerType("SourceSnapshot")
                            .ownerName("Backup: " + gameTitle)
                            .createdAt(s.getCreatedAt())
                            .build();
                });
            }
            case "cccd_image" -> {
                Page<User> users = userRepo.searchKycImages(cleanSearch, pageable);
                List<UploadedFileResponse> list = new java.util.ArrayList<>();
                for (User u : users.getContent()) {
                    if (u.getKycFrontImageUrl() != null && !u.getKycFrontImageUrl().isEmpty()) {
                        list.add(UploadedFileResponse.builder()
                                .id("cccd-front-" + u.getId())
                                .fileName(extractFileName(u.getKycFrontImageUrl()))
                                .fileType("cccd_image")
                                .fileUrl(seaweedFsService.resolvePublicUrl(u.getKycFrontImageUrl()))
                                .storageProvider(inferProvider(u.getKycFrontImageUrl()))
                                .ownerId(u.getId())
                                .ownerType("User")
                                .ownerName((u.getKycFullName() != null ? u.getKycFullName() : u.getEmail()) + " (Mặt trước)")
                                .createdAt(u.getKycVerifiedAt() != null ? u.getKycVerifiedAt() : u.getCreatedAt())
                                .build());
                    }
                    if (u.getKycBackImageUrl() != null && !u.getKycBackImageUrl().isEmpty()) {
                        list.add(UploadedFileResponse.builder()
                                .id("cccd-back-" + u.getId())
                                .fileName(extractFileName(u.getKycBackImageUrl()))
                                .fileType("cccd_image")
                                .fileUrl(seaweedFsService.resolvePublicUrl(u.getKycBackImageUrl()))
                                .storageProvider(inferProvider(u.getKycBackImageUrl()))
                                .ownerId(u.getId())
                                .ownerType("User")
                                .ownerName((u.getKycFullName() != null ? u.getKycFullName() : u.getEmail()) + " (Mặt sau)")
                                .createdAt(u.getKycVerifiedAt() != null ? u.getKycVerifiedAt() : u.getCreatedAt())
                                .build());
                    }
                }
                resultPage = new org.springframework.data.domain.PageImpl<>(list, pageable, users.getTotalElements());
            }
            default -> throw new RuntimeException("Phân loại file không hợp lệ: " + category);
        }

        return ResponseEntity.ok(ApiResponse.success(resultPage, "OK"));
    }

    // ── Game / Asset — drill-down (gom thumbnail + source snapshot / file chính theo từng thực thể) ──

    @GetMapping("/games")
    @Operation(summary = "Danh sách Game — mỗi dòng gộp thumbnail + source snapshot của game đó")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<Page<GameFileSummaryResponse>>> listGamesForFileManagement(
            @RequestParam(required = false, defaultValue = "") String search,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Game> games = gameRepo.searchGamesForFileManagement(search.trim(), pageable);

        return ResponseEntity.ok(ApiResponse.success(games.map(g -> {
            int fileCount = (g.getThumbnailUrl() != null && !g.getThumbnailUrl().isBlank() ? 1 : 0)
                    + snapshotRepo.findByGameIdOrderByCreatedAtDesc(g.getId()).size();
            return GameFileSummaryResponse.builder()
                    .id(g.getId())
                    .title(g.getTitle())
                    .thumbnailUrl(g.getThumbnailUrl() != null ? seaweedFsService.resolvePublicUrl(g.getThumbnailUrl()) : null)
                    .publishingType(g.getPublishingType() != null ? g.getPublishingType().name() : null)
                    .status(g.getStatus() != null ? g.getStatus().name() : null)
                    .creatorName(g.getCreator() != null ? g.getCreator().getFullName() : "Unknown")
                    .fileCount(fileCount)
                    .createdAt(g.getCreatedAt())
                    .build();
        }), "OK"));
    }

    @GetMapping("/games/{id}")
    @Operation(summary = "Chi tiết file của 1 Game — thumbnail + toàn bộ SourceSnapshot")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<GameFileDetailResponse>> getGameFileDetail(@PathVariable UUID id) {
        Game g = gameRepo.findById(id).orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));

        List<UploadedFileResponse> files = new ArrayList<>();
        if (g.getThumbnailUrl() != null && !g.getThumbnailUrl().isBlank()) {
            files.add(UploadedFileResponse.builder()
                    .id("gamethumb-" + g.getId())
                    .fileName(extractFileName(g.getThumbnailUrl()))
                    .fileType("game_media")
                    .fileUrl(seaweedFsService.resolvePublicUrl(g.getThumbnailUrl()))
                    .storageProvider(inferProvider(g.getThumbnailUrl()))
                    .ownerId(g.getId())
                    .ownerType("Game")
                    .ownerName(g.getTitle())
                    .createdAt(g.getCreatedAt())
                    .build());
        }

        files.addAll(snapshotRepo.findByGameIdOrderByCreatedAtDesc(id).stream()
                .filter(s -> s.getBundleUrl() != null && !s.getBundleUrl().isBlank())
                .map(s -> UploadedFileResponse.builder()
                        .id("snapshot-" + s.getId())
                        .fileName(extractFileName(s.getBundleUrl()))
                        .fileType("source_bundle")
                        .fileUrl(seaweedFsService.resolvePublicUrl(s.getBundleUrl()))
                        .storageProvider(inferProvider(s.getBundleUrl()))
                        .ownerId(s.getId())
                        .ownerType("SourceSnapshot")
                        .ownerName("Backup: " + g.getTitle())
                        .createdAt(s.getCreatedAt())
                        .build())
                .collect(Collectors.toList()));

        return ResponseEntity.ok(ApiResponse.success(GameFileDetailResponse.builder()
                .id(g.getId())
                .title(g.getTitle())
                .publishingType(g.getPublishingType() != null ? g.getPublishingType().name() : null)
                .status(g.getStatus() != null ? g.getStatus().name() : null)
                .creatorName(g.getCreator() != null ? g.getCreator().getFullName() : "Unknown")
                .files(files)
                .build(), "OK"));
    }

    @GetMapping("/assets")
    @Operation(summary = "Danh sách Asset — mỗi dòng gộp thumbnail + file chính của asset đó")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<Page<AssetFileSummaryResponse>>> listAssetsForFileManagement(
            @RequestParam(required = false, defaultValue = "") String search,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Asset> assets = itemRepo.searchAssetsForFileManagement(search.trim(), pageable);

        return ResponseEntity.ok(ApiResponse.success(assets.map(a -> {
            boolean hasThumb = a.getThumbnailUrl() != null && !a.getThumbnailUrl().isBlank();
            boolean hasFile = a.getFileUrl() != null && !a.getFileUrl().isBlank() && !"pending".equals(a.getFileUrl());
            int fileCount = (hasThumb ? 1 : 0) + (hasFile ? 1 : 0);
            return AssetFileSummaryResponse.builder()
                    .id(a.getId())
                    .title(a.getTitle())
                    .thumbnailUrl(hasThumb ? seaweedFsService.resolvePublicUrl(a.getThumbnailUrl()) : null)
                    .status(a.getStatus() != null ? a.getStatus().name() : null)
                    .sellerName(a.getSeller() != null ? a.getSeller().getFullName() : "Unknown")
                    .fileCount(fileCount)
                    .createdAt(a.getCreatedAt())
                    .build();
        }), "OK"));
    }

    @GetMapping("/assets/{id}")
    @Operation(summary = "Chi tiết file của 1 Asset — thumbnail + file chính")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<AssetFileDetailResponse>> getAssetFileDetail(@PathVariable UUID id) {
        Asset a = itemRepo.findById(id).orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));

        List<UploadedFileResponse> files = new ArrayList<>();
        if (a.getThumbnailUrl() != null && !a.getThumbnailUrl().isBlank()) {
            files.add(UploadedFileResponse.builder()
                    .id("assetthumb-" + a.getId())
                    .fileName(extractFileName(a.getThumbnailUrl()))
                    .fileType("asset_media")
                    .fileUrl(seaweedFsService.resolvePublicUrl(a.getThumbnailUrl()))
                    .storageProvider(inferProvider(a.getThumbnailUrl()))
                    .ownerId(a.getId())
                    .ownerType("Asset")
                    .ownerName(a.getTitle())
                    .createdAt(a.getCreatedAt())
                    .build());
        }
        if (a.getFileUrl() != null && !a.getFileUrl().isBlank() && !"pending".equals(a.getFileUrl())) {
            files.add(UploadedFileResponse.builder()
                    .id("assetfile-" + a.getId())
                    .fileName(extractFileName(a.getFileUrl()))
                    .fileType("source_bundle")
                    .fileUrl(seaweedFsService.resolvePublicUrl(a.getFileUrl()))
                    .storageProvider(inferProvider(a.getFileUrl()))
                    .ownerId(a.getId())
                    .ownerType("Asset")
                    .ownerName(a.getTitle())
                    .createdAt(a.getCreatedAt())
                    .build());
        }

        return ResponseEntity.ok(ApiResponse.success(AssetFileDetailResponse.builder()
                .id(a.getId())
                .title(a.getTitle())
                .status(a.getStatus() != null ? a.getStatus().name() : null)
                .sellerName(a.getSeller() != null ? a.getSeller().getFullName() : "Unknown")
                .files(files)
                .build(), "OK"));
    }

    @DeleteMapping("/files")
    @Operation(summary = "Xóa file vật lý khỏi storage và cập nhật DB")
    public ResponseEntity<ApiResponse<Void>> deleteUploadedFile(
            @RequestParam String fileUrl,
            @RequestParam String fileType,
            @RequestParam String ownerType,
            @RequestParam String ownerId) {

        String objectKey = extractObjectKey(fileUrl);
        if (objectKey == null || objectKey.isBlank()) {
            throw new RuntimeException("Không thể trích xuất object key từ URL: " + fileUrl);
        }

        // 1. Physical delete
        try {
            seaweedFsService.deleteObject(objectKey);
        } catch (Exception e) {
            System.err.println("Lỗi khi xóa file vật lý trên storage (bỏ qua để dọn dẹp DB): " + e.getMessage());
        }

        // 2. Database update
        UUID uuid = UUID.fromString(ownerId);
        switch (ownerType.toLowerCase()) {
            case "user" -> userRepo.findById(uuid).ifPresent(u -> {
                boolean changed = false;
                if (fileUrl.equals(u.getAvatarUrl())) {
                    u.setAvatarUrl(null);
                    changed = true;
                }
                if (fileUrl.equals(u.getKycFrontImageUrl())) {
                    u.setKycFrontImageUrl(null);
                    changed = true;
                }
                if (fileUrl.equals(u.getKycBackImageUrl())) {
                    u.setKycBackImageUrl(null);
                    changed = true;
                }
                if (changed) {
                    userRepo.save(u);
                }
            });
            case "game" -> gameRepo.findById(uuid).ifPresent(g -> {
                if (fileUrl.equals(g.getThumbnailUrl())) {
                    g.setThumbnailUrl(null);
                    gameRepo.save(g);
                }
            });
            case "marketplaceitem" -> itemRepo.findById(uuid).ifPresent(m -> {
                boolean changed = false;
                if (fileUrl.equals(m.getThumbnailUrl())) {
                    m.setThumbnailUrl(null);
                    changed = true;
                }
                if (fileUrl.equals(m.getFileUrl())) {
                    m.setFileUrl(null);
                    changed = true;
                }
                if (changed) {
                    itemRepo.save(m);
                }
            });
            case "media" -> mediaRepo.deleteById(uuid);
            case "contract" -> contractRepo.findById(uuid).ifPresent(c -> {
                if (fileUrl.equals(c.getPdfUrl())) {
                    c.setPdfUrl(null);
                    contractRepo.save(c);
                }
            });
            case "sourcesnapshot" -> snapshotRepo.findById(uuid).ifPresent(s -> {
                if (fileUrl.equals(s.getBundleUrl())) {
                    s.setBundleUrl(null);
                    snapshotRepo.save(s);
                }
            });
        }

        return ResponseEntity.ok(ApiResponse.success(null, "Xóa tập tin thành công"));
    }

    // ── Helper methods ────────────────────────────────────────

    private String extractFileName(String url) {
        if (url == null || url.isBlank()) return "unknown";
        try {
            int qIdx = url.indexOf('?');
            String cleanUrl = qIdx != -1 ? url.substring(0, qIdx) : url;
            int slashIdx = cleanUrl.lastIndexOf('/');
            if (slashIdx != -1 && slashIdx < cleanUrl.length() - 1) {
                String encodedName = cleanUrl.substring(slashIdx + 1);
                return URLDecoder.decode(encodedName, StandardCharsets.UTF_8);
            }
        } catch (Exception e) {
            // ignore decoding error
        }
        return url;
    }

    private String inferProvider(String url) {
        return "seaweedfs";
    }

    private String extractObjectKey(String url) {
        if (url == null || url.isBlank()) return null;
        try {
            int qIdx = url.indexOf('?');
            String cleanUrl = qIdx != -1 ? url.substring(0, qIdx) : url;
            
            String path;
            if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
                URL uri = new URL(cleanUrl);
                path = uri.getPath();
            } else {
                path = cleanUrl;
            }
            
            path = URLDecoder.decode(path, StandardCharsets.UTF_8);
            
            // SeaweedFS/local path
            if (path.startsWith("/godotlaunch/")) {
                return path.substring("/godotlaunch/".length());
            } else if (path.startsWith("godotlaunch/")) {
                return path.substring("godotlaunch/".length());
            } else if (path.startsWith("/")) {
                return path.substring(1);
            }
            return path;
        } catch (Exception e) {
            int lastSlash = url.lastIndexOf('/');
            if (lastSlash != -1) {
                try {
                    return URLDecoder.decode(url.substring(lastSlash + 1), StandardCharsets.UTF_8);
                } catch (Exception ex) {
                    return url.substring(lastSlash + 1);
                }
            }
        }
        return null;
    }

    @GetMapping("/files/download")
    @Operation(summary = "Tải xuống hoặc xem file thông qua backend proxy (hỗ trợ file SeaweedFS)")
    public ResponseEntity<InputStreamResource> downloadFile(
            @RequestParam String fileUrl,
            @RequestParam String fileType) {

        String objectKey = extractObjectKey(fileUrl);
        if (objectKey == null || objectKey.isBlank()) {
            throw new RuntimeException("Không thể trích xuất object key từ URL: " + fileUrl);
        }

        try {
            InputStream inputStream = seaweedFsService.getObjectStream(objectKey);
            InputStreamResource resource = new InputStreamResource(inputStream);

            String fileName = extractFileName(fileUrl);
            String contentType = "application/octet-stream";
            String lowerName = fileName.toLowerCase();
            if (lowerName.endsWith(".pdf")) {
                contentType = "application/pdf";
            } else if (lowerName.endsWith(".png")) {
                contentType = "image/png";
            } else if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
                contentType = "image/jpeg";
            } else if (lowerName.endsWith(".gif")) {
                contentType = "image/gif";
            } else if (lowerName.endsWith(".webp")) {
                contentType = "image/webp";
            } else if (lowerName.endsWith(".mp4")) {
                contentType = "video/mp4";
            } else if (lowerName.endsWith(".zip")) {
                contentType = "application/zip";
            }

            String disposition = "attachment; filename=\"" + fileName + "\"";
            if (contentType.startsWith("image/") || contentType.equals("application/pdf") || contentType.startsWith("video/")) {
                disposition = "inline; filename=\"" + fileName + "\"";
            }

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(resource);

        } catch (Exception e) {
            Throwable cause = e.getCause();
            String errorMsg = e.getMessage() != null ? e.getMessage() : "";
            String causeMsg = cause != null && cause.getMessage() != null ? cause.getMessage() : "";
            
            if (errorMsg.contains("status: 404") 
                    || causeMsg.contains("status: 404")) {
                throw new AppException(ErrorCode.FILE_NOT_FOUND);
            }
            throw new RuntimeException("Không thể tải file từ nhà lưu trữ: " + e.getMessage(), e);
        }
    }
}
