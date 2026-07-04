package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.StorageAccountRequest;
import com.godotlaunch.backend.dto.request.StorageBucketRequest;
import com.godotlaunch.backend.dto.request.StorageRoutingRequest;
import com.godotlaunch.backend.dto.response.*;
import com.godotlaunch.backend.entity.StorageAccount;
import com.godotlaunch.backend.entity.StorageBucket;
import com.godotlaunch.backend.entity.StorageRouting;
import com.godotlaunch.backend.entity.enums.FileType;
import com.godotlaunch.backend.repository.StorageAccountRepository;
import com.godotlaunch.backend.repository.StorageBucketRepository;
import com.godotlaunch.backend.repository.StorageRoutingRepository;
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
import com.godotlaunch.backend.dto.response.UploadedFileResponse;
import com.godotlaunch.backend.security.EncryptionUtils;
import com.godotlaunch.backend.service.impl.StorageRouter;
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
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.constant.ErrorCode;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/storage")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Admin Storage API", description = "Quản lý storage providers, buckets và file routing")
public class AdminStorageController {

    private final StorageAccountRepository accountRepo;
    private final StorageBucketRepository bucketRepo;
    private final StorageRoutingRepository routingRepo;
    private final EncryptionUtils encryptionUtils;
    private final StorageRouter storageRouter;
    private final UserRepository userRepo;
    private final GameRepository gameRepo;
    private final AssetRepository itemRepo;
    private final MediaRepository mediaRepo;
    private final ContractRepository contractRepo;
    private final SourceSnapshotRepository snapshotRepo;

    // ── Accounts ─────────────────────────────────────────────

    @GetMapping("/accounts")
    @Operation(summary = "Lấy danh sách storage accounts")
    public ResponseEntity<ApiResponse<List<StorageAccountResponse>>> listAccounts() {
        List<StorageAccountResponse> list = accountRepo.findAll().stream()
                .map(this::toAccountResponse).toList();
        return ResponseEntity.ok(ApiResponse.success(list, "OK"));
    }

    @PostMapping("/accounts")
    @Operation(summary = "Thêm storage account mới (AWS S3 hoặc SeaweedFS)")
    public ResponseEntity<ApiResponse<StorageAccountResponse>> createAccount(
            @Valid @RequestBody StorageAccountRequest req) {
        StorageAccount account = new StorageAccount();
        account.setName(req.getName());
        account.setProvider(req.getProvider());
        account.setConfig(encryptionUtils.encrypt(req.getConfig()));
        account.setActive(req.isActive());
        StorageAccount saved = accountRepo.save(account);
        return ResponseEntity.ok(ApiResponse.success(toAccountResponse(saved), "Storage account created"));
    }

    @PutMapping("/accounts/{id}")
    @Operation(summary = "Cập nhật storage account (bao gồm credentials)")
    public ResponseEntity<ApiResponse<StorageAccountResponse>> updateAccount(
            @PathVariable UUID id,
            @Valid @RequestBody StorageAccountRequest req) {
        StorageAccount account = accountRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Account not found"));
        account.setName(req.getName());
        account.setProvider(req.getProvider());
        account.setConfig(encryptionUtils.encrypt(req.getConfig()));
        account.setActive(req.isActive());
        storageRouter.clearCache();
        return ResponseEntity.ok(ApiResponse.success(toAccountResponse(accountRepo.save(account)), "Updated"));
    }

    @PatchMapping("/accounts/{id}/name")
    @Operation(summary = "Đổi tên account (không thay đổi credentials)")
    public ResponseEntity<ApiResponse<StorageAccountResponse>> renameAccount(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        StorageAccount account = accountRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Account not found"));
        String newName = body.get("name");
        if (newName != null && !newName.isBlank()) {
            account.setName(newName);
        }
        return ResponseEntity.ok(ApiResponse.success(toAccountResponse(accountRepo.save(account)), "Renamed"));
    }

    @DeleteMapping("/accounts/{id}")
    @Operation(summary = "Xóa storage account")
    public ResponseEntity<ApiResponse<Void>> deleteAccount(@PathVariable UUID id) {
        accountRepo.deleteById(id);
        storageRouter.clearCache();
        return ResponseEntity.ok(ApiResponse.success(null, "Deleted"));
    }

    // ── Buckets ──────────────────────────────────────────────

    @GetMapping("/buckets")
    @Operation(summary = "Lấy danh sách buckets")
    public ResponseEntity<ApiResponse<List<StorageBucketResponse>>> listBuckets() {
        List<StorageBucketResponse> list = bucketRepo.findAll().stream()
                .map(this::toBucketResponse).toList();
        return ResponseEntity.ok(ApiResponse.success(list, "OK"));
    }

    @PostMapping("/buckets")
    @Operation(summary = "Thêm bucket mới")
    public ResponseEntity<ApiResponse<StorageBucketResponse>> createBucket(
            @Valid @RequestBody StorageBucketRequest req) {
        StorageAccount account = accountRepo.findById(req.getAccountId())
                .orElseThrow(() -> new RuntimeException("Account not found"));
        StorageBucket bucket = new StorageBucket();
        bucket.setAccount(account);
        bucket.setName(req.getName());
        bucket.setRegion(req.getRegion());
        bucket.setPublicUrl(req.getPublicUrl());
        return ResponseEntity.ok(ApiResponse.success(toBucketResponse(bucketRepo.save(bucket)), "Bucket created"));
    }

    @DeleteMapping("/buckets/{id}")
    @Operation(summary = "Xóa bucket")
    public ResponseEntity<ApiResponse<Void>> deleteBucket(@PathVariable UUID id) {
        bucketRepo.deleteById(id);
        storageRouter.clearCache();
        return ResponseEntity.ok(ApiResponse.success(null, "Deleted"));
    }

    // ── Routing ──────────────────────────────────────────────

    @GetMapping("/routing")
    @Operation(summary = "Lấy toàn bộ file routing config")
    public ResponseEntity<ApiResponse<List<StorageRoutingResponse>>> listRouting() {
        List<StorageRoutingResponse> list = routingRepo.findAllWithBucketAndAccount().stream()
                .map(this::toRoutingResponse).toList();
        return ResponseEntity.ok(ApiResponse.success(list, "OK"));
    }

    @GetMapping("/routing/file-types")
    @Operation(summary = "Lấy danh sách file types có thể routing")
    public ResponseEntity<ApiResponse<List<String>>> listFileTypes() {
        List<String> types = Arrays.stream(FileType.values()).map(Enum::name).toList();
        return ResponseEntity.ok(ApiResponse.success(types, "OK"));
    }

    @PutMapping("/routing")
    @Operation(summary = "Cập nhật routing cho một file type (drag & drop apply)")
    public ResponseEntity<ApiResponse<StorageRoutingResponse>> updateRouting(
            @Valid @RequestBody StorageRoutingRequest req) {
        StorageBucket bucket = bucketRepo.findById(req.getBucketId())
                .orElseThrow(() -> new RuntimeException("Bucket not found"));

        StorageRouting routing = routingRepo.findByFileType(req.getFileType())
                .orElse(new StorageRouting());
        routing.setFileType(req.getFileType());
        routing.setBucket(bucket);

        routingRepo.save(routing);
        StorageRouting saved = routingRepo.findByFileTypeWithJoin(req.getFileType())
                .orElseThrow(() -> new RuntimeException("Routing not found after save"));
        storageRouter.clearCache();
        return ResponseEntity.ok(ApiResponse.success(toRoutingResponse(saved), "Routing updated"));
    }

    @PutMapping("/routing/batch")
    @Operation(summary = "Cập nhật nhiều routing cùng lúc")
    public ResponseEntity<ApiResponse<List<StorageRoutingResponse>>> batchUpdateRouting(
            @Valid @RequestBody List<StorageRoutingRequest> requests) {
        List<StorageRoutingResponse> results = requests.stream().map(req -> {
            StorageBucket bucket = bucketRepo.findById(req.getBucketId())
                    .orElseThrow(() -> new RuntimeException("Bucket not found: " + req.getBucketId()));
            StorageRouting routing = routingRepo.findByFileType(req.getFileType())
                    .orElse(new StorageRouting());
            routing.setFileType(req.getFileType());
            routing.setBucket(bucket);
            routingRepo.save(routing);
            return toRoutingResponse(routingRepo.findByFileTypeWithJoin(req.getFileType())
                    .orElseThrow(() -> new RuntimeException("Routing not found after save")));
        }).toList();
        storageRouter.clearCache();
        return ResponseEntity.ok(ApiResponse.success(results, "Batch routing updated"));
    }

    // ── Mappers ──────────────────────────────────────────────

    private StorageAccountResponse toAccountResponse(StorageAccount a) {
        StorageAccountResponse r = new StorageAccountResponse();
        r.setId(a.getId());
        r.setName(a.getName());
        r.setProvider(a.getProvider());
        r.setActive(a.isActive());
        r.setCreatedAt(a.getCreatedAt());
        return r;
    }

    private StorageBucketResponse toBucketResponse(StorageBucket b) {
        StorageBucketResponse r = new StorageBucketResponse();
        r.setId(b.getId());
        r.setAccountId(b.getAccount().getId());
        r.setAccountName(b.getAccount().getName());
        r.setProvider(b.getAccount().getProvider());
        r.setName(b.getName());
        r.setRegion(b.getRegion());
        r.setPublicUrl(b.getPublicUrl());
        r.setCreatedAt(b.getCreatedAt());
        return r;
    }

    private StorageRoutingResponse toRoutingResponse(StorageRouting rt) {
        StorageRoutingResponse r = new StorageRoutingResponse();
        r.setFileType(rt.getFileType());
        r.setUpdatedAt(rt.getUpdatedAt());

        // bucket = null → file_type chưa được admin gán bucket
        StorageBucket bucket = rt.getBucket();
        if (bucket != null) {
            r.setBucketId(bucket.getId());
            r.setBucketName(bucket.getName());
            r.setAccountId(bucket.getAccount().getId());
            r.setAccountName(bucket.getAccount().getName());
            r.setProvider(bucket.getAccount().getProvider());
        }
        return r;
    }

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
                        .fileUrl(u.getAvatarUrl())
                        .storageProvider(inferProvider(u.getAvatarUrl()))
                        .ownerId(u.getId())
                        .ownerType("User")
                        .ownerName(u.getFullName() != null ? u.getFullName() : u.getEmail())
                        .createdAt(u.getCreatedAt())
                        .build());
            }
            // "game_zip" đã gộp vào "source_snapshot": file source game nằm ở SourceSnapshot.bundleUrl
            // (game = repo + snapshot), không còn Game.file_url.
            case "game_thumbnail" -> {
                Page<Game> games = gameRepo.searchGameThumbnails(cleanSearch, pageable);
                resultPage = games.map(g -> UploadedFileResponse.builder()
                        .id("gamethumb-" + g.getId())
                        .fileName(extractFileName(g.getThumbnailUrl()))
                        .fileType("game_media")
                        .fileUrl(g.getThumbnailUrl())
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
                        .fileUrl(m.getFileUrl())
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
                        .fileUrl(m.getThumbnailUrl())
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
                            .fileUrl(med.getMediaUrl())
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
                            .fileUrl(c.getPdfUrl())
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
                            .fileUrl(s.getBundleUrl())
                            .storageProvider(inferProvider(s.getBundleUrl()))
                            .ownerId(s.getId())
                            .ownerType("SourceSnapshot")
                            .ownerName("Backup: " + gameTitle + " (sha: " + s.getCommitSha() + ")")
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
                                .fileUrl(u.getKycFrontImageUrl())
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
                                .fileUrl(u.getKycBackImageUrl())
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

    @DeleteMapping("/files")
    @Operation(summary = "Xóa file vật lý khỏi storage và cập nhật DB")
    public ResponseEntity<ApiResponse<Void>> deleteUploadedFile(
            @RequestParam String fileUrl,
            @RequestParam String fileType,
            @RequestParam String ownerType,
            @RequestParam String ownerId) {

        FileType type;
        try {
            type = FileType.valueOf(fileType.toLowerCase());
        } catch (IllegalArgumentException e) {
            type = FileType.game_media;
        }

        String objectKey = extractObjectKey(fileUrl);
        if (objectKey == null || objectKey.isBlank()) {
            throw new RuntimeException("Không thể trích xuất object key từ URL: " + fileUrl);
        }

        // 1. Physical delete
        try {
            storageRouter.delete(fileUrl, type, objectKey);
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
        if (url == null) return "unknown";
        if (url.contains("s3.amazonaws.com") || url.contains(".s3.") || url.contains("amazonaws.com")) {
            return "aws_s3";
        }
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
            
            // URL decode path to correctly restore spaces (%20) and special characters
            path = URLDecoder.decode(path, StandardCharsets.UTF_8);
            
            if (cleanUrl.contains("amazonaws.com")) {
                if (path.startsWith("/")) {
                    path = path.substring(1);
                }
                return path;
            }
            
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
    @Operation(summary = "Tải xuống hoặc xem file thông qua backend proxy (hỗ trợ cả file private S3 & SeaweedFS)")
    public ResponseEntity<InputStreamResource> downloadFile(
            @RequestParam String fileUrl,
            @RequestParam String fileType) {

        FileType type;
        try {
            type = FileType.valueOf(fileType.toLowerCase());
        } catch (IllegalArgumentException e) {
            type = FileType.game_media;
        }

        String objectKey = extractObjectKey(fileUrl);
        if (objectKey == null || objectKey.isBlank()) {
            throw new RuntimeException("Không thể trích xuất object key từ URL: " + fileUrl);
        }

        try {
            InputStream inputStream = storageRouter.getInputStream(fileUrl, type, objectKey);
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
            
            if (e instanceof software.amazon.awssdk.services.s3.model.NoSuchKeyException 
                    || errorMsg.contains("NoSuchKey") 
                    || errorMsg.contains("status: 404") 
                    || causeMsg.contains("status: 404")
                    || causeMsg.contains("NoSuchKey")) {
                throw new AppException(ErrorCode.FILE_NOT_FOUND);
            }
            throw new RuntimeException("Không thể tải file từ nhà lưu trữ: " + e.getMessage(), e);
        }
    }
}
