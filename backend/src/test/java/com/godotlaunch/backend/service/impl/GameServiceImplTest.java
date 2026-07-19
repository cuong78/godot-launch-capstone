package com.godotlaunch.backend.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.godotlaunch.backend.config.SourceProcessingClient;
import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.CreateGameRequest;
import com.godotlaunch.backend.dto.response.GameResponse;
import com.godotlaunch.backend.entity.Category;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.GameVersion;
import com.godotlaunch.backend.entity.Role;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.enums.GameStatus;
import com.godotlaunch.backend.entity.enums.PublishingType;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.CategoryRepository;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.GameVersionRepository;
import com.godotlaunch.backend.repository.MediaRepository;
import com.godotlaunch.backend.repository.SourceSnapshotRepository;
import com.godotlaunch.backend.repository.TagRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.AiReviewService;
import com.godotlaunch.backend.service.AsyncVirusScanService;
import com.godotlaunch.backend.service.AuditLogService;
import com.godotlaunch.backend.service.ClamAVService;
import com.godotlaunch.backend.service.EmailService;
import com.godotlaunch.backend.service.GitHubRepoService;
import com.godotlaunch.backend.service.SeaweedFsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GameServiceImplTest {

    @Mock
    private GameRepository gameRepository;
    @Mock
    private GameVersionRepository gameVersionRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private CategoryRepository categoryRepository;
    @Mock
    private MediaRepository mediaRepository;
    @Mock
    private TagRepository tagRepository;
    @Mock
    private SeaweedFsService seaweedFsService;
    @Mock
    private ClamAVService clamAVService;
    @Mock
    private AsyncVirusScanService asyncVirusScanService;
    @Mock
    private EmailService emailService;
    @Mock
    private AuditLogService auditLogService;
    @Mock
    private GitHubRepoService gitHubRepoService;
    @Mock
    private SourceProcessingClient sourceProcessingClient;
    @Mock
    private SourceSnapshotRepository sourceSnapshotRepository;
    @Mock
    private ObjectMapper objectMapper;
    @Mock
    private AiReviewService aiReviewService;

    @InjectMocks
    private GameServiceImpl gameService;

    private User adminUser;
    private User devUser;
    private Game game;
    private UUID gameId;

    @BeforeEach
    void setUp() {
        Role adminRole = new Role();
        adminRole.setId(UUID.randomUUID());
        adminRole.setName("admin");

        adminUser = new User();
        adminUser.setId(UUID.randomUUID());
        adminUser.setEmail("admin@godotlaunch.dev");
        adminUser.setRole(adminRole);

        Role devRole = new Role();
        devRole.setId(UUID.randomUUID());
        devRole.setName("developer");

        devUser = new User();
        devUser.setId(UUID.randomUUID());
        devUser.setEmail("dev@godotlaunch.dev");
        devUser.setRole(devRole);

        gameId = UUID.randomUUID();
        game = new Game();
        game.setId(gameId);
        game.setTitle("Godot Platformer");
        game.setCreator(devUser);
        game.setStatus(GameStatus.pending);
        game.setPublishingType(PublishingType.marketplace_listing);
    }

    @Test
    @DisplayName("createGameDraft_ShouldRejectAdminRequester")
    void createGameDraft_ShouldRejectAdminRequester() {
        CreateGameRequest request = new CreateGameRequest();
        request.setTitle("Platform Test Game");

        when(userRepository.findWithRoleByEmail(adminUser.getEmail())).thenReturn(Optional.of(adminUser));

        AppException exception = assertThrows(
                AppException.class,
                () -> gameService.createGameDraft(request, adminUser.getEmail())
        );

        assertEquals(ErrorCode.ACCESS_DENIED, exception.getErrorCode());
        verify(gameRepository, never()).save(any());
    }

    @Test
    @DisplayName("shouldCreateGameDraft_WhenDeveloperRequester")
    void shouldCreateGameDraft_WhenDeveloperRequester() {
        CreateGameRequest request = new CreateGameRequest();
        request.setTitle("Platform Test Game");
        request.setPublishingType(PublishingType.marketplace_listing);

        when(userRepository.findWithRoleByEmail(devUser.getEmail())).thenReturn(Optional.of(devUser));
        when(gameRepository.save(any(Game.class))).thenAnswer(i -> {
            Game g = i.getArgument(0);
            g.setId(gameId);
            return g;
        });

        UUID id = gameService.createGameDraft(request, devUser.getEmail());

        assertThat(id).isEqualTo(gameId);
        verify(gameVersionRepository, times(1)).save(any(GameVersion.class));
    }

    @Test
    @DisplayName("shouldGetGameById_WhenExists")
    void shouldGetGameById_WhenExists() {
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));
        when(mediaRepository.findByGame_IdOrderByCreatedAtDesc(gameId)).thenReturn(Collections.emptyList());
        when(sourceSnapshotRepository.findByGameIdOrderByCreatedAtDesc(gameId)).thenReturn(Collections.emptyList());
        when(gameVersionRepository.findByGame_IdAndIsCurrentTrue(gameId)).thenReturn(Optional.empty());

        GameResponse response = gameService.getGameById(gameId);

        assertThat(response).isNotNull();
        assertThat(response.getTitle()).isEqualTo("Godot Platformer");
    }

    @Test
    @DisplayName("shouldApproveGame_WhenStatusPending")
    void shouldApproveGame_WhenStatusPending() {
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));

        gameService.approveGame(gameId);

        assertThat(game.getStatus()).isEqualTo(GameStatus.published);
        verify(emailService, times(1)).sendGameStatusNotification(
                eq("dev@godotlaunch.dev"), eq("Godot Platformer"), contains("APPROVED"), anyString());
    }

    @Test
    @DisplayName("shouldRejectGame_WhenStatusPending")
    void shouldRejectGame_WhenStatusPending() {
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));

        gameService.rejectGame(gameId, "Policy violation");

        assertThat(game.getStatus()).isEqualTo(GameStatus.rejected);
        verify(emailService, times(1)).sendGameStatusNotification(
                eq("dev@godotlaunch.dev"), eq("Godot Platformer"), eq("REJECTED"), eq("Policy violation"));
    }
}
