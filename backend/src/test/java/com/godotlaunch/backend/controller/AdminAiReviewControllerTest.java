package com.godotlaunch.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.AiReviewReportResponse;
import com.godotlaunch.backend.entity.AiReviewReport;
import com.godotlaunch.backend.repository.AiReviewReportRepository;
import com.godotlaunch.backend.service.AiReviewService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminAiReviewControllerTest {

    @Mock
    private AiReviewReportRepository aiReviewReportRepository;

    @Mock
    private AiReviewService aiReviewService;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private AdminAiReviewController adminAiReviewController;

    private UUID gameId;
    private UUID itemId;
    private AiReviewReport report;

    @BeforeEach
    void setUp() {
        gameId = UUID.randomUUID();
        itemId = UUID.randomUUID();

        report = new AiReviewReport();
        report.setId(UUID.randomUUID());
        report.setCodeQualityScore(90);
    }

    @Test
    @DisplayName("shouldTriggerGameReview_WhenCalled")
    void shouldTriggerGameReview_WhenCalled() {
        doNothing().when(aiReviewService).reviewGameAsync(gameId);

        ResponseEntity<ApiResponse<String>> response = adminAiReviewController.triggerGameReview(gameId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(aiReviewService, times(1)).reviewGameAsync(gameId);
    }

    @Test
    @DisplayName("shouldTriggerItemReview_WhenCalled")
    void shouldTriggerItemReview_WhenCalled() {
        doNothing().when(aiReviewService).reviewAssetAsync(itemId);

        ResponseEntity<ApiResponse<String>> response = adminAiReviewController.triggerItemReview(itemId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(aiReviewService, times(1)).reviewAssetAsync(itemId);
    }

    @Test
    @DisplayName("shouldGetLatestForGame_WhenExists")
    void shouldGetLatestForGame_WhenExists() {
        when(aiReviewReportRepository.findFirstByGameIdOrderByCreatedAtDesc(gameId)).thenReturn(Optional.of(report));

        ResponseEntity<ApiResponse<AiReviewReportResponse>> response = adminAiReviewController.getLatestForGame(gameId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getCodeQualityScore()).isEqualTo(90);
    }

    @Test
    @DisplayName("shouldGetLatestForItem_WhenExists")
    void shouldGetLatestForItem_WhenExists() {
        when(aiReviewReportRepository.findFirstByAssetIdOrderByCreatedAtDesc(itemId)).thenReturn(Optional.of(report));

        ResponseEntity<ApiResponse<AiReviewReportResponse>> response = adminAiReviewController.getLatestForItem(itemId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("shouldGetHistoryForGame_WhenCalled")
    void shouldGetHistoryForGame_WhenCalled() {
        when(aiReviewReportRepository.findByGameIdOrderByCreatedAtDesc(gameId)).thenReturn(List.of(report));

        ResponseEntity<ApiResponse<List<AiReviewReportResponse>>> response = adminAiReviewController.getHistoryForGame(gameId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData()).hasSize(1);
    }

    @Test
    @DisplayName("shouldGetHistoryForItem_WhenCalled")
    void shouldGetHistoryForItem_WhenCalled() {
        when(aiReviewReportRepository.findByAssetIdOrderByCreatedAtDesc(itemId)).thenReturn(List.of(report));

        ResponseEntity<ApiResponse<List<AiReviewReportResponse>>> response = adminAiReviewController.getHistoryForItem(itemId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData()).hasSize(1);
    }
}
