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
import com.godotlaunch.backend.security.EncryptionUtils;
import com.godotlaunch.backend.service.impl.StorageRouter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
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
            @RequestBody java.util.Map<String, String> body) {
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
        r.setBucketId(rt.getBucket().getId());
        r.setBucketName(rt.getBucket().getName());
        r.setAccountId(rt.getBucket().getAccount().getId());
        r.setAccountName(rt.getBucket().getAccount().getName());
        r.setProvider(rt.getBucket().getAccount().getProvider());
        r.setUpdatedAt(rt.getUpdatedAt());
        return r;
    }
}
