package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.AssetFileDetailResponse;
import com.godotlaunch.backend.dto.response.GameFileDetailResponse;
import com.godotlaunch.backend.dto.response.UploadedFileResponse;
import com.godotlaunch.backend.entity.Asset;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.repository.AssetRepository;
import com.godotlaunch.backend.repository.ContractRepository;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.MediaRepository;
import com.godotlaunch.backend.repository.SourceSnapshotRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.SeaweedFsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.InputStreamResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.io.ByteArrayInputStream;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminStorageControllerTest {

    @Mock
    private SeaweedFsService seaweedFsService;

    @Mock
    private UserRepository userRepo;

    @Mock
    private GameRepository gameRepo;

    @Mock
    private AssetRepository itemRepo;

    @Mock
    private MediaRepository mediaRepo;

    @Mock
    private ContractRepository contractRepo;

    @Mock
    private SourceSnapshotRepository snapshotRepo;

    @InjectMocks
    private AdminStorageController adminStorageController;

    private UUID entityId;

    @BeforeEach
    void setUp() {
        entityId = UUID.randomUUID();
    }

    @Test
    @DisplayName("shouldListUploadedFiles_ForAvatarCategory")
    void shouldListUploadedFiles_ForAvatarCategory() {
        // Arrange
        User user = new User();
        user.setId(entityId);
        user.setFullName("John Doe");
        user.setAvatarUrl("http://storage.local/godotlaunch/avatars/john.png");

        Page<User> userPage = new PageImpl<>(List.of(user));
        when(userRepo.searchAvatars(anyString(), any(Pageable.class))).thenReturn(userPage);
        when(seaweedFsService.resolvePublicUrl(anyString())).thenReturn("http://storage.local/godotlaunch/avatars/john.png");

        // Act
        ResponseEntity<ApiResponse<Page<UploadedFileResponse>>> response =
                adminStorageController.listUploadedFiles("avatar", "", null, 0, 20);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getContent()).hasSize(1);
        assertThat(response.getBody().getData().getContent().get(0).getOwnerName()).isEqualTo("John Doe");
    }

    @Test
    @DisplayName("shouldGetGameFileDetail_WhenGameExists")
    void shouldGetGameFileDetail_WhenGameExists() {
        // Arrange
        Game game = new Game();
        game.setId(entityId);
        game.setTitle("Space Platformer");
        game.setThumbnailUrl("http://storage.local/godotlaunch/games/thumb.png");

        when(gameRepo.findById(entityId)).thenReturn(Optional.of(game));
        when(seaweedFsService.resolvePublicUrl(anyString())).thenReturn("http://storage.local/godotlaunch/games/thumb.png");
        when(snapshotRepo.findByGameIdOrderByCreatedAtDesc(entityId)).thenReturn(Collections.emptyList());

        // Act
        ResponseEntity<ApiResponse<GameFileDetailResponse>> response =
                adminStorageController.getGameFileDetail(entityId);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getTitle()).isEqualTo("Space Platformer");
        assertThat(response.getBody().getData().getFiles()).hasSize(1);
    }

    @Test
    @DisplayName("shouldGetAssetFileDetail_WhenAssetExists")
    void shouldGetAssetFileDetail_WhenAssetExists() {
        // Arrange
        Asset asset = new Asset();
        asset.setId(entityId);
        asset.setTitle("GUI Pack");
        asset.setThumbnailUrl("http://storage.local/godotlaunch/assets/thumb.png");
        asset.setFileUrl("http://storage.local/godotlaunch/assets/pack.zip");

        when(itemRepo.findById(entityId)).thenReturn(Optional.of(asset));
        when(seaweedFsService.resolvePublicUrl(anyString())).thenReturn("http://storage.local/resolved.png");

        // Act
        ResponseEntity<ApiResponse<AssetFileDetailResponse>> response =
                adminStorageController.getAssetFileDetail(entityId);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getTitle()).isEqualTo("GUI Pack");
        assertThat(response.getBody().getData().getFiles()).hasSize(2);
    }

    @Test
    @DisplayName("shouldDeleteUploadedFile_PhysicalAndDB")
    void shouldDeleteUploadedFile_PhysicalAndDB() {
        // Arrange
        String fileUrl = "http://localhost:8888/godotlaunch/avatars/user.png";
        User user = new User();
        user.setId(entityId);
        user.setAvatarUrl(fileUrl);

        when(userRepo.findById(entityId)).thenReturn(Optional.of(user));

        // Act
        ResponseEntity<ApiResponse<Void>> response = adminStorageController.deleteUploadedFile(
                fileUrl, "avatar", "user", entityId.toString());

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(seaweedFsService, times(1)).deleteObject("avatars/user.png");
        verify(userRepo, times(1)).save(user);
        assertThat(user.getAvatarUrl()).isNull();
    }

    @Test
    @DisplayName("shouldDownloadFile_WhenObjectKeyValid")
    void shouldDownloadFile_WhenObjectKeyValid() {
        // Arrange
        String fileUrl = "http://localhost:8888/godotlaunch/contracts/contract.pdf";
        ByteArrayInputStream bais = new ByteArrayInputStream("PDF content".getBytes());
        when(seaweedFsService.getObjectStream("contracts/contract.pdf")).thenReturn(bais);

        // Act
        ResponseEntity<InputStreamResource> response = adminStorageController.downloadFile(fileUrl, "pdf_contract");

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getContentType().toString()).isEqualTo("application/pdf");
    }
}
