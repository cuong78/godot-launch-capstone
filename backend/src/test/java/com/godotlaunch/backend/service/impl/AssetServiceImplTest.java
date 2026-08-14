package com.godotlaunch.backend.service.impl;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.anyString;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.godotlaunch.backend.config.SourceProcessingClient;
import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.CreateAssetRequest;
import com.godotlaunch.backend.dto.request.UpdateAssetRequest;
import com.godotlaunch.backend.dto.response.AssetResponse;
import com.godotlaunch.backend.entity.Asset;
import com.godotlaunch.backend.entity.Role;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.Category;
import com.godotlaunch.backend.entity.Tag;
import com.godotlaunch.backend.entity.enums.ItemStatus;
import com.godotlaunch.backend.entity.enums.AuditAction;
import com.godotlaunch.backend.entity.enums.AuditTarget;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.AssetRepository;
import com.godotlaunch.backend.repository.CategoryRepository;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.MediaRepository;
import com.godotlaunch.backend.repository.OrderRepository;
import com.godotlaunch.backend.repository.SourceSnapshotRepository;
import com.godotlaunch.backend.repository.TagRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.AiReviewService;
import com.godotlaunch.backend.service.AsyncVirusScanService;
import com.godotlaunch.backend.service.AuditLogService;
import com.godotlaunch.backend.service.EmailService;
import com.godotlaunch.backend.service.GitHubRepoService;
import com.godotlaunch.backend.service.SeaweedFsService;

@ExtendWith(MockitoExtension.class)
class AssetServiceImplTest {

    @Mock
    private AssetRepository assetRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private CategoryRepository categoryRepository;
    @Mock
    private GameRepository gameRepository;
    @Mock
    private TagRepository tagRepository;
    @Mock
    private SeaweedFsService seaweedFsService;
    @Mock
    private AsyncVirusScanService asyncVirusScanService;
    @Mock
    private EmailService emailService;
    @Mock
    private GitHubRepoService gitHubRepoService;
    @Mock
    private SourceProcessingClient sourceProcessingClient;
    @Mock
    private SourceSnapshotRepository sourceSnapshotRepository;
    @Mock
    private MediaRepository mediaRepository;
    @Mock
    private OrderRepository orderRepository;
    @Mock
    private ObjectMapper objectMapper;
    @Mock
    private AiReviewService aiReviewService;
    @Mock
    private AuditLogService auditLogService;
    @Mock
    private com.godotlaunch.backend.service.NotificationService notificationService;
    @Mock
    private UnifiedAssetUploadHelper unifiedAssetUploadHelper;

    @InjectMocks
    private AssetServiceImpl assetService;

    private User developerUser;
    private User otherDeveloperUser;
    private User adminUser;
    private Asset asset;

    @BeforeEach
    void setUp() {
        Role developerRole = new Role();
        developerRole.setId(UUID.randomUUID());
        developerRole.setName("developer");

        Role adminRole = new Role();
        adminRole.setId(UUID.randomUUID());
        adminRole.setName("admin");

        developerUser = new User();
        developerUser.setId(UUID.randomUUID());
        developerUser.setEmail("dev@godotlaunch.dev");
        developerUser.setRole(developerRole);
        developerUser.setFaceVerified(true);

        otherDeveloperUser = new User();
        otherDeveloperUser.setId(UUID.randomUUID());
        otherDeveloperUser.setEmail("other@godotlaunch.dev");
        otherDeveloperUser.setRole(developerRole);
        otherDeveloperUser.setFaceVerified(true);

        adminUser = new User();
        adminUser.setId(UUID.randomUUID());
        adminUser.setEmail("admin@godotlaunch.dev");
        adminUser.setRole(adminRole);
        adminUser.setFaceVerified(true);

        asset = new Asset();
        asset.setId(UUID.randomUUID());
        asset.setSeller(developerUser);
        asset.setFileUrl("pending");
    }

    @Test
    void createAsset_UTCID01_SuccessWithMinimalFields() {
        CreateAssetRequest request = new CreateAssetRequest();
        request.setTitle("Asset Pack");
        request.setPrice(BigDecimal.TEN);

        when(userRepository.findWithRoleByEmail(developerUser.getEmail())).thenReturn(Optional.of(developerUser));
        when(assetRepository.save(any(Asset.class))).thenAnswer(invocation -> {
            Asset toSave = invocation.getArgument(0);
            toSave.setId(asset.getId());
            return toSave;
        });

        UUID createdId = assetService.createAsset(request, developerUser.getEmail());

        assertEquals(asset.getId(), createdId);
        verify(assetRepository).save(any(Asset.class));
    }

    @Test
    void createAsset_UTCID02_SuccessWithAllFields() {
        CreateAssetRequest request = new CreateAssetRequest();
        request.setTitle("Custom Asset Pack");
        request.setPrice(BigDecimal.ONE);
        UUID categoryId = UUID.randomUUID();
        request.setCategoryId(categoryId);
        request.setFileUrl("http://seaweedfs/custom.zip");
        UUID tagId = UUID.randomUUID();
        request.setTagIds(java.util.List.of(tagId));

        com.godotlaunch.backend.entity.Category category = new com.godotlaunch.backend.entity.Category();
        category.setId(categoryId);
        category.setName("3D Models");

        com.godotlaunch.backend.entity.Tag tag = new com.godotlaunch.backend.entity.Tag();
        tag.setId(tagId);
        tag.setName("Godot");

        when(userRepository.findWithRoleByEmail(developerUser.getEmail())).thenReturn(Optional.of(developerUser));
        when(categoryRepository.findById(categoryId)).thenReturn(Optional.of(category));
        when(tagRepository.findByIdIn(request.getTagIds())).thenReturn(java.util.List.of(tag));
        when(assetRepository.save(any(Asset.class))).thenAnswer(invocation -> {
            Asset toSave = invocation.getArgument(0);
            toSave.setId(asset.getId());
            return toSave;
        });

        UUID createdId = assetService.createAsset(request, developerUser.getEmail());

        assertEquals(asset.getId(), createdId);
        verify(assetRepository).save(any(Asset.class));
    }

    @Test
    void createAsset_UTCID03_UserNotFound() {
        CreateAssetRequest request = new CreateAssetRequest();
        request.setTitle("Asset Pack");
        request.setPrice(BigDecimal.ZERO);

        when(userRepository.findWithRoleByEmail("nonexistent@example.com")).thenReturn(Optional.empty());

        AppException exception = assertThrows(
                AppException.class,
                () -> assetService.createAsset(request, "nonexistent@example.com")
        );

        assertEquals(ErrorCode.USER_NOT_FOUND, exception.getErrorCode());
        verify(assetRepository, never()).save(any(Asset.class));
    }

    @Test
    void createAsset_UTCID05_FaceVerificationRequired() {
        CreateAssetRequest request = new CreateAssetRequest();
        request.setTitle("Asset Pack");
        request.setPrice(BigDecimal.ZERO);

        User unverifiedDev = new User();
        unverifiedDev.setId(UUID.randomUUID());
        unverifiedDev.setEmail("unverified@godotlaunch.dev");
        unverifiedDev.setRole(developerUser.getRole());
        unverifiedDev.setFaceVerified(false);

        when(userRepository.findWithRoleByEmail(unverifiedDev.getEmail())).thenReturn(Optional.of(unverifiedDev));

        AppException exception = assertThrows(
                AppException.class,
                () -> assetService.createAsset(request, unverifiedDev.getEmail())
        );

        assertEquals(ErrorCode.FACE_VERIFY_REQUIRED, exception.getErrorCode());
        verify(assetRepository, never()).save(any(Asset.class));
    }

    @Test
    void createAsset_UTCID06_CategoryNotFound() {
        CreateAssetRequest request = new CreateAssetRequest();
        request.setTitle("Asset Pack");
        request.setPrice(BigDecimal.ZERO);
        UUID invalidCategoryId = UUID.randomUUID();
        request.setCategoryId(invalidCategoryId);

        when(userRepository.findWithRoleByEmail(developerUser.getEmail())).thenReturn(Optional.of(developerUser));
        when(categoryRepository.findById(invalidCategoryId)).thenReturn(Optional.empty());

        AppException exception = assertThrows(
                AppException.class,
                () -> assetService.createAsset(request, developerUser.getEmail())
        );

        assertEquals(ErrorCode.CATEGORY_NOT_FOUND, exception.getErrorCode());
        verify(assetRepository, never()).save(any(Asset.class));
    }

    @Test
    void createAsset_ShouldRejectAdminRequester() {
        CreateAssetRequest request = new CreateAssetRequest();
        request.setTitle("Asset Pack");
        request.setPrice(BigDecimal.ZERO);

        when(userRepository.findWithRoleByEmail(adminUser.getEmail())).thenReturn(Optional.of(adminUser));

        AppException exception = assertThrows(
                AppException.class,
                () -> assetService.createAsset(request, adminUser.getEmail())
        );

        assertEquals(ErrorCode.ACCESS_DENIED, exception.getErrorCode());
        verify(assetRepository, never()).save(any(Asset.class));
    }

    @Test
    void getPresignedUploadUrl_ShouldRejectDeveloperWhoDoesNotOwnAsset() {
        when(userRepository.findWithRoleByEmail(otherDeveloperUser.getEmail())).thenReturn(Optional.of(otherDeveloperUser));
        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));

        AppException exception = assertThrows(
                AppException.class,
                () -> assetService.getPresignedUploadUrl(asset.getId(), "application/zip", otherDeveloperUser.getEmail())
        );

        assertEquals(ErrorCode.ACCESS_DENIED, exception.getErrorCode());
    }

    @Test
    void confirmUploadComplete_ShouldUpdateFileForOwnerDeveloper() {
        String objectKey = "marketplace/items/" + asset.getId() + "/project.zip";
        String fileUrl = "http://storage.local/" + objectKey;

        when(userRepository.findWithRoleByEmail(developerUser.getEmail())).thenReturn(Optional.of(developerUser));
        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));
        when(seaweedFsService.getFileUrl(objectKey)).thenReturn(fileUrl);
        when(assetRepository.save(any(Asset.class))).thenAnswer(invocation -> invocation.getArgument(0));

        assetService.confirmUploadComplete(asset.getId(), null, developerUser.getEmail());

        assertEquals(fileUrl, asset.getFileUrl());
        verify(asyncVirusScanService).scanAndProcessAsset(asset.getId(), objectKey);
    }

    @Test
    void getAssetById_ShouldReturnAssetResponse_WhenAssetExists() {
        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));
        when(userRepository.findByEmail(developerUser.getEmail())).thenReturn(Optional.of(developerUser));

        AssetResponse response = assetService.getAssetById(asset.getId(), developerUser.getEmail());

        assertEquals(asset.getId(), response.getId());
    }

    @Test
    void updateAsset_ShouldModifyAssetDetails_WhenOwnerRequests() {
        asset.setPrice(new java.math.BigDecimal("99.99"));
        UpdateAssetRequest request = new UpdateAssetRequest();
        request.setTitle("New Asset Title");
        request.setPrice(new java.math.BigDecimal("99.99"));

        when(userRepository.findWithRoleByEmail(developerUser.getEmail())).thenReturn(Optional.of(developerUser));
        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));
        when(assetRepository.save(any(Asset.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AssetResponse response = assetService.updateAsset(asset.getId(), request, developerUser.getEmail());

        assertEquals("New Asset Title", response.getTitle());
        assertEquals(0, response.getPrice().compareTo(new java.math.BigDecimal("99.99")));
    }

    @Test
    void removeAsset_ShouldSoftDeleteAssetAndLogAudit_WhenOwnerRequests() {
        asset.setStatus(ItemStatus.active);
        asset.setTitle("To Be Deleted");

        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));
        when(userRepository.findByEmail(developerUser.getEmail())).thenReturn(Optional.of(developerUser));
        when(assetRepository.save(any(Asset.class))).thenAnswer(invocation -> invocation.getArgument(0));

        assetService.removeAsset(asset.getId(), developerUser.getEmail());

        assertEquals(ItemStatus.removed, asset.getStatus());
        verify(seaweedFsService).deleteObject("marketplace/items/" + asset.getId() + "/project.zip");
        verify(auditLogService).publishAuto(
                eq(AuditAction.marketplace_item_removed),
                eq(AuditTarget.marketplace_item),
                eq(asset.getId()),
                eq("active"),
                eq("removed"),
                anyString()
        );
    }

    @Test
    void uploadItemFile_ShouldUploadAndTriggerReview() throws Exception {
        org.springframework.web.multipart.MultipartFile file = org.mockito.Mockito.mock(org.springframework.web.multipart.MultipartFile.class);
        byte[] content = "test content".getBytes();
        java.io.ByteArrayInputStream bis = new java.io.ByteArrayInputStream(content);
        when(file.getInputStream()).thenReturn(bis);

        asset.setVersion("1.0.0");
        asset.setZipHash("old-hash");

        when(userRepository.findWithRoleByEmail(developerUser.getEmail())).thenReturn(Optional.of(developerUser));
        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));
        when(seaweedFsService.uploadWithKey(eq(file), anyString())).thenReturn("http://seaweedfs/zip");
        when(assetRepository.save(any(Asset.class))).thenAnswer(inv -> inv.getArgument(0));

        assetService.uploadItemFile(asset.getId(), file, developerUser.getEmail());

        assertEquals("http://seaweedfs/zip", asset.getFileUrl());
        assertEquals("1.0.1", asset.getVersion());
        assertThat(asset.getZipHash()).isNotNull();
        verify(asyncVirusScanService).scanAndProcessAsset(eq(asset.getId()), anyString());
        verify(aiReviewService).reviewAssetAsync(asset.getId());
    }

    @Test
    void uploadItemFile_ShouldThrowException_WhenDuplicateFileUploaded() throws Exception {
        org.springframework.web.multipart.MultipartFile file = org.mockito.Mockito.mock(org.springframework.web.multipart.MultipartFile.class);
        byte[] content = "test content".getBytes();
        java.io.ByteArrayInputStream bis = new java.io.ByteArrayInputStream(content);
        when(file.getInputStream()).thenReturn(bis);

        // Pre-calculate SHA-256 hash of "test content"
        java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(content);
        StringBuilder hexString = new StringBuilder();
        for (byte b : hash) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        asset.setZipHash(hexString.toString());

        when(userRepository.findWithRoleByEmail(developerUser.getEmail())).thenReturn(Optional.of(developerUser));
        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));

        AppException ex = assertThrows(AppException.class, () ->
                assetService.uploadItemFile(asset.getId(), file, developerUser.getEmail())
        );
        assertEquals(ErrorCode.BAD_REQUEST, ex.getErrorCode());
    }

    @Test
    void uploadItemMedia_ShouldUploadThumbnail_WhenValid() {
        org.springframework.web.multipart.MultipartFile file = org.mockito.Mockito.mock(org.springframework.web.multipart.MultipartFile.class);
        when(file.getSize()).thenReturn(5L * 1024L * 1024L);
        when(file.getOriginalFilename()).thenReturn("thumb.png");
        when(userRepository.findWithRoleByEmail(developerUser.getEmail())).thenReturn(Optional.of(developerUser));
        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));
        when(seaweedFsService.uploadWithKey(eq(file), anyString())).thenReturn("http://seaweedfs/thumb.png");
        when(assetRepository.save(any(Asset.class))).thenAnswer(inv -> inv.getArgument(0));

        String key = assetService.uploadItemMedia(asset.getId(), "thumbnail", file, developerUser.getEmail());

        assertThat(key).contains("marketplace/items/");
        assertEquals("http://seaweedfs/thumb.png", asset.getThumbnailUrl());
        verify(mediaRepository).save(any());
    }

    @Test
    void uploadItemMedia_ShouldThrowException_WhenMediaFileTooLarge() {
        org.springframework.web.multipart.MultipartFile file = org.mockito.Mockito.mock(org.springframework.web.multipart.MultipartFile.class);
        when(file.getSize()).thenReturn(20L * 1024L * 1024L);
        when(userRepository.findWithRoleByEmail(developerUser.getEmail())).thenReturn(Optional.of(developerUser));
        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));

        AppException exception = assertThrows(
                AppException.class,
                () -> assetService.uploadItemMedia(asset.getId(), "thumbnail", file, developerUser.getEmail())
        );

        assertEquals(ErrorCode.MEDIA_FILE_TOO_LARGE, exception.getErrorCode());
    }

    @Test
    void deleteAssetMedia_ShouldDeleteMediaAndStorageObject() {
        when(userRepository.findWithRoleByEmail(developerUser.getEmail())).thenReturn(Optional.of(developerUser));
        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));

        com.godotlaunch.backend.entity.Media media = new com.godotlaunch.backend.entity.Media();
        media.setMediaUrl("http://storage.local/godotlaunch/marketplace/items/123/media/test.png");
        when(mediaRepository.findByAsset_IdOrderByCreatedAtDesc(asset.getId())).thenReturn(List.of(media));

        assetService.deleteAssetMedia(asset.getId(), "http://storage.local/godotlaunch/marketplace/items/123/media/test.png", developerUser.getEmail());

        verify(mediaRepository).delete(media);
        verify(seaweedFsService).deleteObject("marketplace/items/123/media/test.png");
    }

    @Test
    void approveAsset_ShouldSetActiveAndSendEmail() {
        asset.setStatus(ItemStatus.pending);
        asset.setTitle("Asset Title");

        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));
        when(assetRepository.save(any(Asset.class))).thenAnswer(inv -> inv.getArgument(0));

        assetService.approveAsset(asset.getId());

        assertEquals(ItemStatus.active, asset.getStatus());
        verify(emailService).sendAssetStatusNotification(
                eq(developerUser.getEmail()),
                eq("Asset Title"),
                eq("APPROVED"),
                anyString()
        );
        verify(auditLogService).publishAuto(
                eq(AuditAction.game_published),
                eq(AuditTarget.marketplace_item),
                eq(asset.getId()),
                eq("pending"),
                eq("active"),
                anyString()
        );
    }

    @Test
    void approveAsset_ShouldThrowException_WhenNotPending() {
        asset.setStatus(ItemStatus.active);
        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));

        assertThrows(IllegalStateException.class, () -> assetService.approveAsset(asset.getId()));
    }

    @Test
    void rejectAsset_ShouldSetRejectedAndCleanupZip() {
        asset.setStatus(ItemStatus.pending);
        asset.setTitle("Rejected Pack");

        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));
        when(assetRepository.save(any(Asset.class))).thenAnswer(inv -> inv.getArgument(0));

        assetService.rejectAsset(asset.getId(), "Inappropriate content");

        assertEquals(ItemStatus.rejected, asset.getStatus());
        verify(seaweedFsService).deleteObject("marketplace/items/" + asset.getId() + "/project.zip");
        verify(emailService).sendAssetStatusNotification(
                eq(developerUser.getEmail()),
                eq("Rejected Pack"),
                eq("REJECTED"),
                eq("Inappropriate content")
        );
    }

    @Test
    void getAssetById_ShouldAllowPrivateFields_WhenAdmin() {
        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));
        when(userRepository.findByEmail(adminUser.getEmail())).thenReturn(Optional.of(adminUser));
        when(seaweedFsService.resolvePublicUrl("pending")).thenReturn("http://resolved/pending.zip");

        AssetResponse response = assetService.getAssetById(asset.getId(), adminUser.getEmail());

        assertEquals("http://resolved/pending.zip", response.getFileUrl());
    }

    @Test
    void getAssetById_ShouldNotAllowPrivateFields_WhenOtherUser() {
        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));
        when(userRepository.findByEmail(otherDeveloperUser.getEmail())).thenReturn(Optional.of(otherDeveloperUser));

        AssetResponse response = assetService.getAssetById(asset.getId(), otherDeveloperUser.getEmail());

        assertThat(response.getFileUrl()).isNull();
    }

    @Test
    void rejectAsset_ShouldThrowException_WhenNotPending() {
        asset.setStatus(ItemStatus.active);
        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));

        assertThrows(IllegalStateException.class, () -> assetService.rejectAsset(asset.getId(), "Reason"));
    }

    @Test
    void removeAsset_ShouldSuccess_WhenAdmin() {
        asset.setStatus(ItemStatus.active);
        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));
        when(userRepository.findByEmail(adminUser.getEmail())).thenReturn(Optional.of(adminUser));
        when(assetRepository.save(any(Asset.class))).thenAnswer(inv -> inv.getArgument(0));

        assetService.removeAsset(asset.getId(), adminUser.getEmail());

        assertEquals(ItemStatus.removed, asset.getStatus());
        verify(seaweedFsService).deleteObject("marketplace/items/" + asset.getId() + "/project.zip");
    }

    @Test
    void removeAsset_ShouldSuccess_WhenOwner() {
        asset.setStatus(ItemStatus.active);
        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));
        when(userRepository.findByEmail(developerUser.getEmail())).thenReturn(Optional.of(developerUser));
        when(assetRepository.save(any(Asset.class))).thenAnswer(inv -> inv.getArgument(0));

        assetService.removeAsset(asset.getId(), developerUser.getEmail());

        assertEquals(ItemStatus.removed, asset.getStatus());
    }

    @Test
    void removeAsset_ShouldThrowException_WhenUnauthorized() {
        asset.setStatus(ItemStatus.active);
        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));
        when(userRepository.findByEmail(otherDeveloperUser.getEmail())).thenReturn(Optional.of(otherDeveloperUser));

        assertThrows(AppException.class, () ->
                assetService.removeAsset(asset.getId(), otherDeveloperUser.getEmail())
        );
    }

    @Test
    void getUploadStatus_ShouldReturnMappedResponse() {
        asset.setUploadStatus("PROCESSING");
        asset.setUploadError("Some Error");
        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));
        when(userRepository.findWithRoleByEmail(developerUser.getEmail())).thenReturn(Optional.of(developerUser));

        AssetResponse response = assetService.getUploadStatus(asset.getId(), developerUser.getEmail());

        assertEquals("PROCESSING", response.getUploadStatus());
        assertEquals("Some Error", response.getUploadError());
    }

    @Test
    void startUnifiedAssetUpload_ShouldSetProcessingAndSave() throws Exception {
        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));
        when(userRepository.findWithRoleByEmail(developerUser.getEmail())).thenReturn(Optional.of(developerUser));
        when(assetRepository.saveAndFlush(any(Asset.class))).thenAnswer(inv -> inv.getArgument(0));

        org.springframework.web.multipart.MultipartFile mockFile = org.mockito.Mockito.mock(org.springframework.web.multipart.MultipartFile.class);

        assetService.startUnifiedAssetUpload(asset.getId(), mockFile, developerUser.getEmail());

        assertEquals("PROCESSING", asset.getUploadStatus());
        assertThat(asset.getUploadError()).isNull();
        verify(mockFile).transferTo(any(java.io.File.class));
        verify(unifiedAssetUploadHelper).processUnifiedAssetZipAsync(eq(asset.getId()), any(java.io.File.class));
    }
}
