package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.AssetFileDetailResponse;
import com.godotlaunch.backend.dto.response.GameFileDetailResponse;
import com.godotlaunch.backend.dto.response.UploadedFileResponse;
import com.godotlaunch.backend.dto.response.GameFileSummaryResponse;
import com.godotlaunch.backend.dto.response.AssetFileSummaryResponse;
import com.godotlaunch.backend.entity.Asset;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.Media;
import com.godotlaunch.backend.entity.Contract;
import com.godotlaunch.backend.entity.SourceSnapshot;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
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

    @Test
    @DisplayName("shouldListUploadedFiles_ForGameThumbnailCategory")
    void shouldListUploadedFiles_ForGameThumbnailCategory() {
        Game game = new Game();
        game.setId(entityId);
        game.setTitle("Indie RPG");
        game.setThumbnailUrl("http://storage.local/godotlaunch/games/RPG.png");

        Page<Game> gamePage = new PageImpl<>(List.of(game));
        when(gameRepo.searchGameThumbnails(anyString(), any(Pageable.class))).thenReturn(gamePage);
        when(seaweedFsService.resolvePublicUrl(anyString())).thenReturn("http://storage.local/godotlaunch/games/RPG.png");

        ResponseEntity<ApiResponse<Page<UploadedFileResponse>>> response =
                adminStorageController.listUploadedFiles("game_thumbnail", "", null, 0, 20);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getContent().get(0).getOwnerName()).isEqualTo("Indie RPG");
    }

    @Test
    @DisplayName("shouldListUploadedFiles_ForMarketplaceZipCategory")
    void shouldListUploadedFiles_ForMarketplaceZipCategory() {
        Asset asset = new Asset();
        asset.setId(entityId);
        asset.setTitle("Asset 3D");
        asset.setFileUrl("http://storage.local/godotlaunch/assets/3D.zip");

        Page<Asset> assetPage = new PageImpl<>(List.of(asset));
        when(itemRepo.searchAssetZips(anyString(), any(Pageable.class))).thenReturn(assetPage);
        when(seaweedFsService.resolvePublicUrl(anyString())).thenReturn("http://storage.local/godotlaunch/assets/3D.zip");

        ResponseEntity<ApiResponse<Page<UploadedFileResponse>>> response =
                adminStorageController.listUploadedFiles("marketplace_zip", "", null, 0, 20);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getContent().get(0).getOwnerName()).isEqualTo("Asset 3D");
    }

    @Test
    @DisplayName("shouldListUploadedFiles_ForMarketplaceThumbnailCategory")
    void shouldListUploadedFiles_ForMarketplaceThumbnailCategory() {
        Asset asset = new Asset();
        asset.setId(entityId);
        asset.setTitle("Asset 2D");
        asset.setThumbnailUrl("http://storage.local/godotlaunch/assets/2D.png");

        Page<Asset> assetPage = new PageImpl<>(List.of(asset));
        when(itemRepo.searchAssetThumbnails(anyString(), any(Pageable.class))).thenReturn(assetPage);
        when(seaweedFsService.resolvePublicUrl(anyString())).thenReturn("http://storage.local/godotlaunch/assets/2D.png");

        ResponseEntity<ApiResponse<Page<UploadedFileResponse>>> response =
                adminStorageController.listUploadedFiles("marketplace_thumbnail", "", null, 0, 20);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("shouldListUploadedFiles_ForMediaFileCategory")
    void shouldListUploadedFiles_ForMediaFileCategory() {
        Media media = new Media();
        media.setId(entityId);
        media.setMediaUrl("http://storage.local/godotlaunch/media/vid.mp4");
        media.setMediaType("video");

        Page<Media> mediaPage = new PageImpl<>(List.of(media));
        when(mediaRepo.searchMedia(anyString(), any(Pageable.class))).thenReturn(mediaPage);
        when(seaweedFsService.resolvePublicUrl(anyString())).thenReturn("http://storage.local/godotlaunch/media/vid.mp4");

        ResponseEntity<ApiResponse<Page<UploadedFileResponse>>> response =
                adminStorageController.listUploadedFiles("media_file", "", null, 0, 20);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("shouldListUploadedFiles_ForContractPdfCategory")
    void shouldListUploadedFiles_ForContractPdfCategory() {
        Contract contract = new Contract();
        contract.setId(entityId);
        contract.setPdfUrl("http://storage.local/godotlaunch/contracts/contract.pdf");

        Page<Contract> contractPage = new PageImpl<>(List.of(contract));
        when(contractRepo.searchContracts(anyString(), any(Pageable.class))).thenReturn(contractPage);
        when(seaweedFsService.resolvePublicUrl(anyString())).thenReturn("http://storage.local/godotlaunch/contracts/contract.pdf");

        ResponseEntity<ApiResponse<Page<UploadedFileResponse>>> response =
                adminStorageController.listUploadedFiles("contract_pdf", "", null, 0, 20);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("shouldListUploadedFiles_ForSourceSnapshotCategory")
    void shouldListUploadedFiles_ForSourceSnapshotCategory() {
        SourceSnapshot snapshot = new SourceSnapshot();
        snapshot.setId(entityId);
        snapshot.setBundleUrl("http://storage.local/godotlaunch/snapshots/snap.zip");

        Page<SourceSnapshot> snapshotPage = new PageImpl<>(List.of(snapshot));
        when(snapshotRepo.searchSnapshots(anyString(), any(Pageable.class))).thenReturn(snapshotPage);
        when(seaweedFsService.resolvePublicUrl(anyString())).thenReturn("http://storage.local/godotlaunch/snapshots/snap.zip");

        ResponseEntity<ApiResponse<Page<UploadedFileResponse>>> response =
                adminStorageController.listUploadedFiles("source_snapshot", "", null, 0, 20);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("shouldListUploadedFiles_ForCccdImageCategory")
    void shouldListUploadedFiles_ForCccdImageCategory() {
        User user = new User();
        user.setId(entityId);
        user.setKycFullName("Nguyen Van A");
        user.setKycFrontImageUrl("http://storage.local/godotlaunch/kyc/front.png");
        user.setKycBackImageUrl("http://storage.local/godotlaunch/kyc/back.png");

        Page<User> userPage = new PageImpl<>(List.of(user));
        when(userRepo.searchKycImages(anyString(), any(Pageable.class))).thenReturn(userPage);
        when(seaweedFsService.resolvePublicUrl(anyString())).thenReturn("http://storage.local/resolved.png");

        ResponseEntity<ApiResponse<Page<UploadedFileResponse>>> response =
                adminStorageController.listUploadedFiles("cccd_image", "", null, 0, 20);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("shouldThrowException_WhenInvalidCategory")
    void shouldThrowException_WhenInvalidCategory() {
        assertThatThrownBy(() -> adminStorageController.listUploadedFiles("invalid_category", "", null, 0, 20))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Phân loại file không hợp lệ");
    }

    @Test
    @DisplayName("shouldListGamesForFileManagement_WhenCalled")
    void shouldListGamesForFileManagement_WhenCalled() {
        Game game = new Game();
        game.setId(entityId);
        game.setTitle("Space Runner");
        game.setThumbnailUrl("http://storage.local/godotlaunch/games/thumb.png");

        Page<Game> gamePage = new PageImpl<>(List.of(game));
        when(gameRepo.searchGamesForFileManagement(anyString(), any(Pageable.class))).thenReturn(gamePage);
        when(seaweedFsService.resolvePublicUrl(anyString())).thenReturn("http://storage.local/resolved.png");
        when(snapshotRepo.findByGameIdOrderByCreatedAtDesc(entityId)).thenReturn(Collections.emptyList());

        ResponseEntity<ApiResponse<Page<GameFileSummaryResponse>>> response =
                adminStorageController.listGamesForFileManagement("", 0, 20);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("shouldListAssetsForFileManagement_WhenCalled")
    void shouldListAssetsForFileManagement_WhenCalled() {
        Asset asset = new Asset();
        asset.setId(entityId);
        asset.setTitle("Art Pack");
        asset.setThumbnailUrl("http://storage.local/godotlaunch/assets/thumb.png");

        Page<Asset> assetPage = new PageImpl<>(List.of(asset));
        when(itemRepo.searchAssetsForFileManagement(anyString(), any(Pageable.class))).thenReturn(assetPage);
        when(seaweedFsService.resolvePublicUrl(anyString())).thenReturn("http://storage.local/resolved.png");

        ResponseEntity<ApiResponse<Page<AssetFileSummaryResponse>>> response =
                adminStorageController.listAssetsForFileManagement("", 0, 20);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("shouldDeleteUploadedFile_ForGame")
    void shouldDeleteUploadedFile_ForGame() {
        String fileUrl = "http://storage.local/godotlaunch/games/thumb.png";
        Game game = new Game();
        game.setId(entityId);
        game.setThumbnailUrl(fileUrl);

        when(gameRepo.findById(entityId)).thenReturn(Optional.of(game));

        ResponseEntity<ApiResponse<Void>> response = adminStorageController.deleteUploadedFile(
                fileUrl, "game_thumbnail", "game", entityId.toString());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(game.getThumbnailUrl()).isNull();
    }

    @Test
    @DisplayName("shouldDeleteUploadedFile_ForMarketplaceItem")
    void shouldDeleteUploadedFile_ForMarketplaceItem() {
        String fileUrl = "http://storage.local/godotlaunch/assets/pack.zip";
        Asset asset = new Asset();
        asset.setId(entityId);
        asset.setFileUrl(fileUrl);

        when(itemRepo.findById(entityId)).thenReturn(Optional.of(asset));

        ResponseEntity<ApiResponse<Void>> response = adminStorageController.deleteUploadedFile(
                fileUrl, "source_bundle", "marketplaceitem", entityId.toString());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(asset.getFileUrl()).isNull();
    }

    @Test
    @DisplayName("shouldDeleteUploadedFile_ForContract")
    void shouldDeleteUploadedFile_ForContract() {
        String fileUrl = "http://storage.local/godotlaunch/contracts/contract.pdf";
        Contract contract = new Contract();
        contract.setId(entityId);
        contract.setPdfUrl(fileUrl);

        when(contractRepo.findById(entityId)).thenReturn(Optional.of(contract));

        ResponseEntity<ApiResponse<Void>> response = adminStorageController.deleteUploadedFile(
                fileUrl, "pdf_contract", "contract", entityId.toString());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(contract.getPdfUrl()).isNull();
    }

    @Test
    @DisplayName("shouldDeleteUploadedFile_ForSourceSnapshot")
    void shouldDeleteUploadedFile_ForSourceSnapshot() {
        String fileUrl = "http://storage.local/godotlaunch/snapshots/snap.zip";
        SourceSnapshot snapshot = new SourceSnapshot();
        snapshot.setId(entityId);
        snapshot.setBundleUrl(fileUrl);

        when(snapshotRepo.findById(entityId)).thenReturn(Optional.of(snapshot));

        ResponseEntity<ApiResponse<Void>> response = adminStorageController.deleteUploadedFile(
                fileUrl, "source_bundle", "sourcesnapshot", entityId.toString());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(snapshot.getBundleUrl()).isNull();
    }

    @Test
    @DisplayName("shouldDeleteUploadedFile_ForMedia")
    void shouldDeleteUploadedFile_ForMedia() {
        String fileUrl = "http://storage.local/godotlaunch/media/vid.mp4";
        doNothing().when(mediaRepo).deleteById(entityId);

        ResponseEntity<ApiResponse<Void>> response = adminStorageController.deleteUploadedFile(
                fileUrl, "game_media", "media", entityId.toString());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(mediaRepo, times(1)).deleteById(entityId);
    }
}
