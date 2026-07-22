package com.godotlaunch.backend.service.impl;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
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
import com.godotlaunch.backend.entity.Asset;
import com.godotlaunch.backend.entity.Role;
import com.godotlaunch.backend.entity.User;
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
}
