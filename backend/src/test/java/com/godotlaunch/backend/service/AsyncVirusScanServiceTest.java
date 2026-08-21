package com.godotlaunch.backend.service;

import com.godotlaunch.backend.entity.Asset;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.enums.GameStatus;
import com.godotlaunch.backend.entity.enums.ItemStatus;
import com.godotlaunch.backend.repository.AssetRepository;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.GameVersionRepository;
import com.godotlaunch.backend.repository.SourceSnapshotRepository;
import com.godotlaunch.backend.entity.SourceSnapshot;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AsyncVirusScanServiceTest {

    @Mock
    private ClamAVService clamAVService;

    @Mock
    private SeaweedFsService seaweedFsService;

    @Mock
    private GameRepository gameRepository;

    @Mock
    private GameVersionRepository gameVersionRepository;

    @Mock
    private AssetRepository assetRepository;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private SourceSnapshotRepository sourceSnapshotRepository;

    @InjectMocks
    private AsyncVirusScanService asyncVirusScanService;

    private UUID gameId;
    private UUID assetId;
    private Game mockGame;
    private Asset mockAsset;
    private User mockUser;

    @BeforeEach
    void setUp() {
        gameId = UUID.randomUUID();
        assetId = UUID.randomUUID();

        mockUser = new User();
        mockUser.setId(UUID.randomUUID());
        mockUser.setEmail("dev@godotlaunch.dev");

        mockGame = new Game();
        mockGame.setId(gameId);
        mockGame.setTitle("My Game");
        mockGame.setCreator(mockUser);
        mockGame.setStatus(GameStatus.draft);

        mockAsset = new Asset();
        mockAsset.setId(assetId);
        mockAsset.setTitle("My Asset");
        mockAsset.setSeller(mockUser);
        mockAsset.setStatus(ItemStatus.active);
    }

    @Test
    @DisplayName("shouldScanAndProcessGame_WhenClean")
    void shouldScanAndProcessGame_WhenClean() {
        // Arrange
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(mockGame));
        when(seaweedFsService.getObjectStream("game.zip")).thenReturn(new ByteArrayInputStream(new byte[0]));
        when(clamAVService.scanStream(any())).thenReturn(true);
        when(seaweedFsService.getFileUrl("game.zip")).thenReturn("http://file-url");

        // Act
        asyncVirusScanService.scanAndProcessGame(gameId, "game.zip");

        // Assert
        verify(gameRepository, times(2)).findById(gameId); // 1 in scan, 1 in updateGameStatus
    }

    @Test
    @DisplayName("shouldRejectGame_WhenVirusDetected")
    void shouldRejectGame_WhenVirusDetected() {
        // Arrange
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(mockGame));
        when(seaweedFsService.getObjectStream("game.zip")).thenReturn(new ByteArrayInputStream(new byte[0]));
        when(clamAVService.scanStream(any())).thenReturn(false);

        // Act
        asyncVirusScanService.scanAndProcessGame(gameId, "game.zip");

        // Assert
        verify(seaweedFsService, times(1)).deleteObject("game.zip");
        verify(auditLogService, times(1)).publish(any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("shouldRejectGame_WhenVirusDetectedInDeepSubfolder")
    void shouldRejectGame_WhenVirusDetectedInDeepSubfolder() throws Exception {
        // Create a temporary zip containing a nested file
        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
        try (java.util.zip.ZipOutputStream zos = new java.util.zip.ZipOutputStream(baos)) {
            zos.putNextEntry(new java.util.zip.ZipEntry("deep/folder/malware.exe"));
            zos.write("fake virus content".getBytes());
            zos.closeEntry();
        }
        byte[] zipBytes = baos.toByteArray();

        when(gameRepository.findById(gameId)).thenReturn(Optional.of(mockGame));
        when(seaweedFsService.getObjectStream("game.zip"))
                .thenAnswer(inv -> new ByteArrayInputStream(zipBytes))
                .thenAnswer(inv -> new ByteArrayInputStream(zipBytes));
        
        // 1st scan (outer zip stream) = clean (true), 2nd scan (extracted malware.exe in subfolder) = virus (false)
        when(clamAVService.scanStream(any())).thenReturn(true).thenReturn(false);

        // Act
        asyncVirusScanService.scanAndProcessGame(gameId, "game.zip");

        // Assert
        verify(seaweedFsService, times(1)).deleteObject("game.zip");
        verify(auditLogService, times(1)).publish(any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("shouldScanAndProcessAsset_WhenClean")
    void shouldScanAndProcessAsset_WhenClean() {
        // Arrange
        when(assetRepository.findById(assetId)).thenReturn(Optional.of(mockAsset));
        when(seaweedFsService.getObjectStream("asset.zip")).thenReturn(new ByteArrayInputStream(new byte[0]));
        when(clamAVService.scanStream(any())).thenReturn(true);

        // Act
        asyncVirusScanService.scanAndProcessAsset(assetId, "asset.zip");

        // Assert
        verify(assetRepository, times(1)).findById(assetId);
    }

    @Test
    @DisplayName("shouldRejectAsset_WhenVirusDetected")
    void shouldRejectAsset_WhenVirusDetected() {
        // Arrange
        when(assetRepository.findById(assetId)).thenReturn(Optional.of(mockAsset));
        when(seaweedFsService.getObjectStream("asset.zip")).thenReturn(new ByteArrayInputStream(new byte[0]));
        when(clamAVService.scanStream(any())).thenReturn(false);

        // Act
        asyncVirusScanService.scanAndProcessAsset(assetId, "asset.zip");

        // Assert
        verify(seaweedFsService, times(1)).deleteObject("asset.zip");
    }

    @Test
    @DisplayName("shouldHandleZipSlipException_WhenScanningGame")
    void shouldHandleZipSlipException_WhenScanningGame() {
        // Arrange
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(mockGame));
        when(seaweedFsService.getObjectStream("game.zip")).thenThrow(new SecurityException("Zip Slip detected"));

        // Act
        asyncVirusScanService.scanAndProcessGame(gameId, "game.zip");

        // Assert
        verify(seaweedFsService, times(1)).deleteObject("game.zip");
        verify(auditLogService, times(1)).publish(any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("shouldHandleGeneralException_WhenScanningGame")
    void shouldHandleGeneralException_WhenScanningGame() {
        // Arrange
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(mockGame));
        when(seaweedFsService.getObjectStream("game.zip")).thenThrow(new RuntimeException("General failure"));

        // Act
        asyncVirusScanService.scanAndProcessGame(gameId, "game.zip");

        // Assert
        verify(auditLogService, times(1)).publish(any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("shouldHandleZipSlipException_WhenScanningAsset")
    void shouldHandleZipSlipException_WhenScanningAsset() {
        // Arrange
        when(assetRepository.findById(assetId)).thenReturn(Optional.of(mockAsset));
        when(seaweedFsService.getObjectStream("asset.zip")).thenThrow(new SecurityException("Zip Slip detected"));

        // Act
        asyncVirusScanService.scanAndProcessAsset(assetId, "asset.zip");

        // Assert
        verify(seaweedFsService, times(1)).deleteObject("asset.zip");
        verify(auditLogService, times(1)).publish(any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("shouldReturnEarly_WhenGameNotFound")
    void shouldReturnEarly_WhenGameNotFound() {
        // Arrange
        when(gameRepository.findById(gameId)).thenReturn(Optional.empty());

        // Act
        asyncVirusScanService.scanAndProcessGame(gameId, "game.zip");

        // Assert
        verifyNoInteractions(clamAVService);
    }

    @Test
    @DisplayName("shouldReturnEarly_WhenAssetNotFound")
    void shouldReturnEarly_WhenAssetNotFound() {
        // Arrange
        when(assetRepository.findById(assetId)).thenReturn(Optional.empty());

        // Act
        asyncVirusScanService.scanAndProcessAsset(assetId, "asset.zip");

        // Assert
        verifyNoInteractions(clamAVService);
    }

    @Test
    @DisplayName("shouldSaveToPendingSnapshot_WhenCleanAndLive")
    void shouldSaveToPendingSnapshot_WhenCleanAndLive() {
        // Arrange
        mockGame.setStatus(GameStatus.published);
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(mockGame));
        when(seaweedFsService.getObjectStream("game.zip")).thenReturn(new ByteArrayInputStream(new byte[0]));
        when(clamAVService.scanStream(any())).thenReturn(true);
        when(seaweedFsService.getFileUrl("game.zip")).thenReturn("http://file-url");
        when(sourceSnapshotRepository.save(any(SourceSnapshot.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        asyncVirusScanService.scanAndProcessGame(gameId, "game.zip");

        // Assert
        verify(sourceSnapshotRepository, times(1)).save(any(SourceSnapshot.class));
        verify(gameRepository, times(1)).save(mockGame);
    }
}
