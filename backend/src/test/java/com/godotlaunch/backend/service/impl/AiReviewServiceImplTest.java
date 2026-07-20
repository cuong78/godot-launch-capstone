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

        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));
        when(sourceSnapshotRepository.findById(snapshotId)).thenReturn(Optional.of(snapshot));
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
}
