package com.godotlaunch.backend.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.godotlaunch.backend.config.AiReviewClient;
import com.godotlaunch.backend.dto.response.AiReviewResult;
import com.godotlaunch.backend.entity.AiReviewReport;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.SourceSnapshot;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.repository.AiReviewReportRepository;
import com.godotlaunch.backend.repository.AssetRepository;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.MediaRepository;
import com.godotlaunch.backend.repository.SourceSnapshotRepository;
import com.godotlaunch.backend.service.AuditLogService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
class AiReviewServiceImplTest {

    @Mock private AiReviewClient aiReviewClient;
    @Mock private AiReviewReportRepository aiReviewReportRepository;
    @Mock private GameRepository gameRepository;
    @Mock private AssetRepository assetRepository;
    @Mock private MediaRepository mediaRepository;
    @Mock private SourceSnapshotRepository sourceSnapshotRepository;
    @Mock private AuditLogService auditLogService;
    @Mock private ObjectMapper objectMapper;
    @Mock private com.godotlaunch.backend.service.PlagiarismService plagiarismService;
    @Mock private com.godotlaunch.backend.service.SourceReviewStatusService sourceReviewStatusService;

    @InjectMocks private AiReviewServiceImpl service;

    @Test
    void reviewGameSnapshotUsesExactImmutableBundleAndLinksReport() {
        UUID gameId = UUID.randomUUID();
        UUID snapshotId = UUID.randomUUID();
        User creator = new User();
        creator.setId(UUID.randomUUID());

        Game game = new Game();
        game.setId(gameId);
        game.setTitle("Snapshot Game");
        game.setCreator(creator);

        SourceSnapshot snapshot = new SourceSnapshot();
        snapshot.setId(snapshotId);
        snapshot.setGame(game);
        snapshot.setCommitSha("0123456789012345678901234567890123456789");
        snapshot.setBundleHash("a".repeat(64));
        snapshot.setBundleUrl("http://seaweedfs-filer:8888/godotlaunch/games/" + gameId
                + "/snapshots/" + snapshotId + "/source-bundle.zip");

        AiReviewResult result = new AiReviewResult();
        result.setOverallRecommendation("review");

        when(gameRepository.findForAiReviewById(gameId)).thenReturn(Optional.of(game));
        when(sourceSnapshotRepository.findForReviewById(snapshotId)).thenReturn(Optional.of(snapshot));
        when(mediaRepository.findByGame_IdAndMediaType(eq(gameId), any())).thenReturn(List.of());
        when(aiReviewClient.review(
                eq("code"), eq(snapshotId), eq(snapshot.getBundleUrl()),
                eq(snapshot.getBundleHash()), eq(snapshot.getCommitSha()),
                eq(game.getTitle()), any(), any(), any(), any(), any()))
                .thenReturn(result);

        service.reviewGameSnapshotAsync(gameId, snapshotId);

        ArgumentCaptor<AiReviewReport> reportCaptor = ArgumentCaptor.forClass(AiReviewReport.class);
        verify(aiReviewReportRepository).save(reportCaptor.capture());
        assertThat(reportCaptor.getValue().getGame()).isSameAs(game);
        assertThat(reportCaptor.getValue().getSourceSnapshot()).isSameAs(snapshot);
    }

    @Test
    void reviewGameAsync_ShouldReturn_WhenNoSnapshot() {
        UUID gameId = UUID.randomUUID();
        when(sourceSnapshotRepository.findFirstByGameIdOrderByCreatedAtDesc(gameId)).thenReturn(Optional.empty());

        service.reviewGameAsync(gameId);

        verify(gameRepository, never()).findById(any());
    }

    @Test
    void reviewGameSnapshotAsync_ShouldReturn_WhenGameNotFound() {
        UUID gameId = UUID.randomUUID();
        UUID snapshotId = UUID.randomUUID();
        when(gameRepository.findForAiReviewById(gameId)).thenReturn(Optional.empty());

        service.reviewGameSnapshotAsync(gameId, snapshotId);

        verify(sourceSnapshotRepository, never()).findById(any());
    }

    @Test
    void reviewGameSnapshotAsync_ShouldReturn_WhenSnapshotNotMatchGame() {
        UUID gameId = UUID.randomUUID();
        UUID snapshotId = UUID.randomUUID();
        Game game = new Game();
        game.setId(gameId);

        when(gameRepository.findForAiReviewById(gameId)).thenReturn(Optional.of(game));
        when(sourceSnapshotRepository.findForReviewById(snapshotId)).thenReturn(Optional.empty());

        service.reviewGameSnapshotAsync(gameId, snapshotId);

        verify(aiReviewClient, never()).review(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void reviewGameSnapshotAsync_ShouldReturn_WhenNoBundleUrl() {
        UUID gameId = UUID.randomUUID();
        UUID snapshotId = UUID.randomUUID();
        Game game = new Game();
        game.setId(gameId);
        SourceSnapshot snapshot = new SourceSnapshot();
        snapshot.setGame(game);
        snapshot.setBundleUrl(null);

        when(gameRepository.findForAiReviewById(gameId)).thenReturn(Optional.of(game));
        when(sourceSnapshotRepository.findForReviewById(snapshotId)).thenReturn(Optional.of(snapshot));

        service.reviewGameSnapshotAsync(gameId, snapshotId);

        verify(aiReviewClient, never()).review(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void reviewAssetAsync_ShouldReturn_WhenAssetNotFound() {
        UUID itemId = UUID.randomUUID();
        when(assetRepository.findById(itemId)).thenReturn(Optional.empty());

        service.reviewAssetAsync(itemId);

        verify(aiReviewClient, never()).review(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void reviewAssetAsync_ShouldSucceed() {
        UUID itemId = UUID.randomUUID();
        User seller = new User();
        seller.setId(UUID.randomUUID());

        com.godotlaunch.backend.entity.Asset item = new com.godotlaunch.backend.entity.Asset();
        item.setId(itemId);
        item.setTitle("Asset Item");
        item.setSeller(seller);
        item.setThumbnailUrl("http://thumbnail.png");

        AiReviewResult result = new AiReviewResult();
        result.setOverallRecommendation("approve");

        when(assetRepository.findById(itemId)).thenReturn(Optional.of(item));
        when(mediaRepository.findByAsset_IdAndMediaType(eq(itemId), any())).thenReturn(List.of());
        when(aiReviewClient.review(
                eq("asset"), any(), any(), any(), any(),
                eq(item.getTitle()), any(), any(), any(), any(), any()))
                .thenReturn(result);

        service.reviewAssetAsync(itemId);

        verify(aiReviewReportRepository).save(any(AiReviewReport.class));
    }

    @Test
    void reviewGameSnapshotAsync_ShouldLogAndIgnoreException_WhenClientThrowsException() {
        UUID gameId = UUID.randomUUID();
        UUID snapshotId = UUID.randomUUID();
        User creator = new User();
        creator.setId(UUID.randomUUID());

        Game game = new Game();
        game.setId(gameId);
        game.setTitle("Snapshot Game");
        game.setCreator(creator);

        SourceSnapshot snapshot = new SourceSnapshot();
        snapshot.setId(snapshotId);
        snapshot.setGame(game);
        snapshot.setBundleUrl("http://bundle.zip");

        when(gameRepository.findForAiReviewById(gameId)).thenReturn(Optional.of(game));
        when(sourceSnapshotRepository.findForReviewById(snapshotId)).thenReturn(Optional.of(snapshot));
        when(mediaRepository.findByGame_IdAndMediaType(eq(gameId), any())).thenReturn(List.of());
        when(aiReviewClient.review(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenThrow(new RuntimeException("AI client error"));

        // Should not throw exception
        service.reviewGameSnapshotAsync(gameId, snapshotId);

        verify(aiReviewReportRepository, never()).save(any());
    }

    @Test
    void reviewAssetAsync_ShouldLogAndIgnoreException_WhenClientThrowsException() {
        UUID itemId = UUID.randomUUID();
        User seller = new User();
        seller.setId(UUID.randomUUID());

        com.godotlaunch.backend.entity.Asset item = new com.godotlaunch.backend.entity.Asset();
        item.setId(itemId);
        item.setTitle("Asset Item");
        item.setSeller(seller);

        when(assetRepository.findById(itemId)).thenReturn(Optional.of(item));
        when(mediaRepository.findByAsset_IdAndMediaType(eq(itemId), any())).thenReturn(List.of());
        when(aiReviewClient.review(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenThrow(new RuntimeException("AI client error"));

        // Should not throw exception
        service.reviewAssetAsync(itemId);

        verify(aiReviewReportRepository, never()).save(any());
    }

    @Test
    void reviewGameAsync_ShouldSucceed_WhenLatestSnapshotExists() {
        UUID gameId = UUID.randomUUID();
        UUID snapshotId = UUID.randomUUID();
        User creator = new User();
        creator.setId(UUID.randomUUID());

        Game game = new Game();
        game.setId(gameId);
        game.setTitle("Snapshot Game");
        game.setCreator(creator);

        SourceSnapshot snapshot = new SourceSnapshot();
        snapshot.setId(snapshotId);
        snapshot.setGame(game);
        snapshot.setBundleUrl("http://bundle.zip");

        when(sourceSnapshotRepository.findFirstByGameIdOrderByCreatedAtDesc(gameId)).thenReturn(Optional.of(snapshot));
        when(gameRepository.findForAiReviewById(gameId)).thenReturn(Optional.of(game));
        when(sourceSnapshotRepository.findForReviewById(snapshotId)).thenReturn(Optional.of(snapshot));
        when(mediaRepository.findByGame_IdAndMediaType(eq(gameId), any())).thenReturn(List.of());
        when(aiReviewClient.review(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(new AiReviewResult());

        service.reviewGameAsync(gameId);

        verify(aiReviewReportRepository).save(any(AiReviewReport.class));
    }
}
