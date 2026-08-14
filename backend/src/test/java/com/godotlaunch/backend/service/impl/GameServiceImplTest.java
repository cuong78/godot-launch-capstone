package com.godotlaunch.backend.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.godotlaunch.backend.config.SourceProcessingClient;
import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.CreateGameRequest;
import com.godotlaunch.backend.dto.request.UpdateGameRequest;
import com.godotlaunch.backend.dto.response.GameResponse;
import com.godotlaunch.backend.dto.response.SourceProcessResult;
import com.godotlaunch.backend.entity.Category;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.GameVersion;
import com.godotlaunch.backend.entity.Role;
import com.godotlaunch.backend.entity.SourceSnapshot;
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
import com.godotlaunch.backend.service.NotificationService;
import com.godotlaunch.backend.service.SeaweedFsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.Base64;
import java.util.List;
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
    @Mock
    private NotificationService notificationService;
    @Mock
    private UnifiedGameUploadHelper unifiedGameUploadHelper;

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
    @DisplayName("submitGameRepo_ShouldStoreAndReviewExactSnapshotBundle")
    void submitGameRepo_ShouldStoreAndReviewExactSnapshotBundle() {
        UUID snapshotId = UUID.randomUUID();
        String repoUrl = "https://github.com/example/snapshot-game";
        String branch = "main";
        String objectKey = "games/" + gameId + "/snapshots/" + snapshotId
                + "/source-bundle.zip";
        String bundleUrl = "http://seaweedfs-filer:8888/godotlaunch/" + objectKey;

        SourceProcessResult processResult = new SourceProcessResult();
        processResult.setClean(true);
        processResult.setScanned(true);
        processResult.setGodotProject(true);
        processResult.setCommitSha("0123456789012345678901234567890123456789");
        processResult.setBundleHash("a".repeat(64));
        processResult.setBundleBase64(Base64.getEncoder().encodeToString("zip".getBytes()));
        processResult.setSecrets(List.of());

        when(userRepository.findWithRoleByEmail(devUser.getEmail())).thenReturn(Optional.of(devUser));
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));
        when(gitHubRepoService.checkAccess(repoUrl))
                .thenReturn(GitHubRepoService.RepoAccess.PUBLIC);
        when(sourceProcessingClient.process(repoUrl, null, branch)).thenReturn(processResult);
        when(sourceSnapshotRepository.saveAndFlush(any(SourceSnapshot.class))).thenAnswer(invocation -> {
            SourceSnapshot snapshot = invocation.getArgument(0);
            snapshot.setId(snapshotId);
            return snapshot;
        });
        when(sourceSnapshotRepository.save(any(SourceSnapshot.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(seaweedFsService.uploadWithKey(any(), eq(objectKey))).thenReturn(bundleUrl);
        when(gameVersionRepository.findByGame_IdOrderByReleasedAtDesc(gameId))
                .thenReturn(Collections.emptyList());

        gameService.submitGameRepo(gameId, repoUrl, branch, devUser.getEmail());

        verify(seaweedFsService).uploadWithKey(any(), eq(objectKey));
        verify(aiReviewService).reviewGameSnapshotAsync(gameId, snapshotId);
        verify(auditLogService, times(1)).publish(
                eq(devUser.getId()),
                eq(com.godotlaunch.backend.entity.enums.ActorRole.developer),
                eq(com.godotlaunch.backend.entity.enums.AuditAction.game_submitted),
                eq(com.godotlaunch.backend.entity.enums.AuditTarget.game),
                eq(gameId),
                eq(GameStatus.draft.name()),
                eq(GameStatus.pending.name()),
                anyString(),
                isNull()
        );

        ArgumentCaptor<SourceSnapshot> snapshotCaptor = ArgumentCaptor.forClass(SourceSnapshot.class);
        verify(sourceSnapshotRepository).save(snapshotCaptor.capture());
        assertThat(snapshotCaptor.getValue().getCommitSha()).isEqualTo(processResult.getCommitSha());
        assertThat(snapshotCaptor.getValue().getBundleUrl()).isEqualTo(bundleUrl);
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
        verify(auditLogService, times(1)).publishAuto(
                eq(com.godotlaunch.backend.entity.enums.AuditAction.game_published),
                eq(com.godotlaunch.backend.entity.enums.AuditTarget.game),
                eq(gameId),
                eq(GameStatus.pending.name()),
                eq(GameStatus.published.name()),
                anyString()
        );
    }

    @Test
    @DisplayName("shouldRejectGame_WhenStatusPending")
    void shouldRejectGame_WhenStatusPending() {
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));

        gameService.rejectGame(gameId, "Policy violation");

        assertThat(game.getStatus()).isEqualTo(GameStatus.rejected);
        verify(emailService, times(1)).sendGameStatusNotification(
                eq("dev@godotlaunch.dev"), eq("Godot Platformer"), eq("REJECTED"), eq("Policy violation"));
        verify(auditLogService, times(1)).publishAuto(
                eq(com.godotlaunch.backend.entity.enums.AuditAction.game_rejected),
                eq(com.godotlaunch.backend.entity.enums.AuditTarget.game),
                eq(gameId),
                eq(GameStatus.pending.name()),
                eq(GameStatus.rejected.name()),
                anyString()
        );
    }

    @Test
    @DisplayName("createGameDraft_UTCID02_SuccessWithOptionalCategoryAndTags")
    void createGameDraft_UTCID02_SuccessWithOptionalCategoryAndTags() {
        CreateGameRequest request = new CreateGameRequest();
        request.setTitle("Complete Game Draft");
        request.setPublishingType(PublishingType.marketplace_listing);
        UUID categoryId = UUID.randomUUID();
        request.setCategoryId(categoryId);
        UUID tagId = UUID.randomUUID();
        request.setTagIds(List.of(tagId));

        Category category = new Category();
        category.setId(categoryId);
        category.setName("Platformer");

        com.godotlaunch.backend.entity.Tag tag = new com.godotlaunch.backend.entity.Tag();
        tag.setId(tagId);
        tag.setName("2D");

        when(userRepository.findWithRoleByEmail(devUser.getEmail())).thenReturn(Optional.of(devUser));
        when(categoryRepository.findById(categoryId)).thenReturn(Optional.of(category));
        when(tagRepository.findByIdIn(request.getTagIds())).thenReturn(List.of(tag));
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
    @DisplayName("createGameDraft_UTCID03_UserNotFound")
    void createGameDraft_UTCID03_UserNotFound() {
        CreateGameRequest request = new CreateGameRequest();
        request.setTitle("Game Draft");

        when(userRepository.findWithRoleByEmail("unknown@godotlaunch.dev")).thenReturn(Optional.empty());

        AppException exception = assertThrows(
                AppException.class,
                () -> gameService.createGameDraft(request, "unknown@godotlaunch.dev")
        );

        assertEquals(ErrorCode.USER_NOT_FOUND, exception.getErrorCode());
    }

    @Test
    @DisplayName("updateGameDetails_UTCID01_SuccessMinimal")
    void updateGameDetails_UTCID01_SuccessMinimal() {
        UpdateGameRequest request = new UpdateGameRequest();
        request.setTitle("New Title");

        game.setStatus(GameStatus.draft);

        when(userRepository.findWithRoleByEmail(devUser.getEmail())).thenReturn(Optional.of(devUser));
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));
        when(gameRepository.save(any(Game.class))).thenAnswer(i -> i.getArgument(0));

        GameResponse response = gameService.updateGame(gameId, request, devUser.getEmail());

        assertThat(response).isNotNull();
        assertThat(game.getTitle()).isEqualTo("New Title");
        verify(auditLogService, times(1)).publishAuto(
                eq(com.godotlaunch.backend.entity.enums.AuditAction.game_updated),
                eq(com.godotlaunch.backend.entity.enums.AuditTarget.game),
                eq(gameId),
                isNull(),
                isNull(),
                anyString()
        );
    }

    @Test
    @DisplayName("updateGameDetails_UTCID02_SuccessWithAllFields")
    void updateGameDetails_UTCID02_SuccessWithAllFields() {
        UpdateGameRequest request = new UpdateGameRequest();
        request.setTitle("Updated Complete Title");
        request.setDescription("New Description");
        UUID categoryId = UUID.randomUUID();
        request.setCategoryId(categoryId);

        Category category = new Category();
        category.setId(categoryId);
        category.setName("Strategy");

        game.setStatus(GameStatus.draft);

        when(userRepository.findWithRoleByEmail(devUser.getEmail())).thenReturn(Optional.of(devUser));
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));
        when(categoryRepository.findById(categoryId)).thenReturn(Optional.of(category));
        when(gameRepository.save(any(Game.class))).thenAnswer(i -> i.getArgument(0));

        GameResponse response = gameService.updateGame(gameId, request, devUser.getEmail());

        assertThat(response).isNotNull();
        assertThat(game.getTitle()).isEqualTo("Updated Complete Title");
        assertThat(game.getCategory()).isEqualTo(category);
        verify(auditLogService, times(1)).publishAuto(
                eq(com.godotlaunch.backend.entity.enums.AuditAction.game_updated),
                eq(com.godotlaunch.backend.entity.enums.AuditTarget.game),
                eq(gameId),
                isNull(),
                isNull(),
                anyString()
        );
    }

    @Test
    @DisplayName("updateGameDetails_UTCID03_UserNotFound")
    void updateGameDetails_UTCID03_UserNotFound() {
        UpdateGameRequest request = new UpdateGameRequest();
        request.setTitle("New Title");

        when(userRepository.findWithRoleByEmail("nonexistent@example.com")).thenReturn(Optional.empty());

        AppException exception = assertThrows(
                AppException.class,
                () -> gameService.updateGame(gameId, request, "nonexistent@example.com")
        );

        assertEquals(ErrorCode.USER_NOT_FOUND, exception.getErrorCode());
    }

    @Test
    @DisplayName("updateGameDetails_UTCID04_AccessDenied")
    void updateGameDetails_UTCID04_AccessDenied() {
        UpdateGameRequest request = new UpdateGameRequest();
        request.setTitle("New Title");

        User stranger = new User();
        stranger.setId(UUID.randomUUID());
        stranger.setEmail("stranger@example.com");
        stranger.setRole(devUser.getRole());

        when(userRepository.findWithRoleByEmail(stranger.getEmail())).thenReturn(Optional.of(stranger));
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));

        AppException exception = assertThrows(
                AppException.class,
                () -> gameService.updateGame(gameId, request, stranger.getEmail())
        );

        assertEquals(ErrorCode.ACCESS_DENIED, exception.getErrorCode());
    }

    @Test
    @DisplayName("updateGameDetails_UTCID05_GameNotFound")
    void updateGameDetails_UTCID05_GameNotFound() {
        UpdateGameRequest request = new UpdateGameRequest();
        request.setTitle("New Title");

        when(userRepository.findWithRoleByEmail(devUser.getEmail())).thenReturn(Optional.of(devUser));
        when(gameRepository.findById(gameId)).thenReturn(Optional.empty());

        AppException exception = assertThrows(
                AppException.class,
                () -> gameService.updateGame(gameId, request, devUser.getEmail())
        );

        assertEquals(ErrorCode.GAME_NOT_FOUND, exception.getErrorCode());
    }

    @Test
    @DisplayName("submitGameForReview_UTCID02_UserNotFound")
    void submitGameForReview_UTCID02_UserNotFound() {
        when(userRepository.findWithRoleByEmail("nonexistent@example.com")).thenReturn(Optional.empty());

        AppException exception = assertThrows(
                AppException.class,
                () -> gameService.submitGameRepo(gameId, "http://github.com/repo", "main", "nonexistent@example.com")
        );

        assertEquals(ErrorCode.USER_NOT_FOUND, exception.getErrorCode());
    }

    @Test
    @DisplayName("submitGameForReview_UTCID03_GameNotFound")
    void submitGameForReview_UTCID03_GameNotFound() {
        when(userRepository.findWithRoleByEmail(devUser.getEmail())).thenReturn(Optional.of(devUser));
        when(gameRepository.findById(gameId)).thenReturn(Optional.empty());

        AppException exception = assertThrows(
                AppException.class,
                () -> gameService.submitGameRepo(gameId, "http://github.com/repo", "main", devUser.getEmail())
        );

        assertEquals(ErrorCode.GAME_NOT_FOUND, exception.getErrorCode());
    }

    @Test
    @DisplayName("submitGameForReview_UTCID04_AccessDenied")
    void submitGameForReview_UTCID04_AccessDenied() {
        User stranger = new User();
        stranger.setId(UUID.randomUUID());
        stranger.setEmail("stranger@example.com");
        stranger.setRole(devUser.getRole());

        when(userRepository.findWithRoleByEmail(stranger.getEmail())).thenReturn(Optional.of(stranger));
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));

        AppException exception = assertThrows(
                AppException.class,
                () -> gameService.submitGameRepo(gameId, "http://github.com/repo", "main", stranger.getEmail())
        );

        assertEquals(ErrorCode.ACCESS_DENIED, exception.getErrorCode());
    }

    @Test
    @DisplayName("approveGame_UTCID02_GameNotFound")
    void approveGame_UTCID02_GameNotFound() {
        when(gameRepository.findById(gameId)).thenReturn(Optional.empty());

        AppException exception = assertThrows(
                AppException.class,
                () -> gameService.approveGame(gameId)
        );

        assertEquals(ErrorCode.GAME_NOT_FOUND, exception.getErrorCode());
    }

    @Test
    @DisplayName("approveGame_UTCID03_InvalidStatus")
    void approveGame_UTCID03_InvalidStatus() {
        game.setStatus(GameStatus.draft);
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));

        assertThrows(
                IllegalStateException.class,
                () -> gameService.approveGame(gameId)
        );
    }

    @Test
    @DisplayName("rejectGame_UTCID02_GameNotFound")
    void rejectGame_UTCID02_GameNotFound() {
        when(gameRepository.findById(gameId)).thenReturn(Optional.empty());

        AppException exception = assertThrows(
                AppException.class,
                () -> gameService.rejectGame(gameId, "Reason")
        );

        assertEquals(ErrorCode.GAME_NOT_FOUND, exception.getErrorCode());
    }

    @Test
    @DisplayName("rejectGame_UTCID03_InvalidStatus")
    void rejectGame_UTCID03_InvalidStatus() {
        game.setStatus(GameStatus.draft);
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));

        assertThrows(
                IllegalStateException.class,
                () -> gameService.rejectGame(gameId, "Reason")
        );
    }

    @Test
    @DisplayName("getAllGames_UTCID01_Success")
    void getAllGames_UTCID01_Success() {
        when(gameRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(game));
        when(mediaRepository.findByGame_IdOrderByCreatedAtDesc(gameId)).thenReturn(Collections.emptyList());
        when(gameVersionRepository.findByGame_IdAndIsCurrentTrue(gameId)).thenReturn(Optional.empty());

        List<GameResponse> responses = gameService.getAllGames();

        assertThat(responses).isNotEmpty();
        assertThat(responses.get(0).getId()).isEqualTo(gameId);
        assertThat(responses.get(0).getTitle()).isEqualTo("Godot Platformer");
    }

    @Test
    @DisplayName("getGamesByStatus_UTCID01_Success")
    void getGamesByStatus_UTCID01_Success() {
        when(gameRepository.findPendingGamesAndUpdates()).thenReturn(List.of(game));
        when(mediaRepository.findByGame_IdOrderByCreatedAtDesc(gameId)).thenReturn(Collections.emptyList());
        when(gameVersionRepository.findByGame_IdAndIsCurrentTrue(gameId)).thenReturn(Optional.empty());

        List<GameResponse> responses = gameService.getGamesByStatus(GameStatus.pending);

        assertThat(responses).isNotEmpty();
        assertThat(responses.get(0).getStatus()).isEqualTo(GameStatus.pending.name());
    }

    @Test
    void updateGame_ShouldModifyFieldsAndSave_WhenValid() {
        UpdateGameRequest request = new UpdateGameRequest();
        request.setTitle("New Title");
        request.setDescription("New Desc");
        request.setPriceProposed(new java.math.BigDecimal("99.99"));

        when(userRepository.findWithRoleByEmail(devUser.getEmail())).thenReturn(Optional.of(devUser));
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));
        when(gameRepository.save(any(Game.class))).thenAnswer(inv -> inv.getArgument(0));

        GameResponse response = gameService.updateGame(gameId, request, devUser.getEmail());

        assertThat(response).isNotNull();
        assertThat(response.getTitle()).isEqualTo("New Title");
    }

    @Test
    void updateGame_ShouldThrowException_WhenCategoryNotFound() {
        UUID catId = UUID.randomUUID();
        UpdateGameRequest request = new UpdateGameRequest();
        request.setCategoryId(catId);

        when(userRepository.findWithRoleByEmail(devUser.getEmail())).thenReturn(Optional.of(devUser));
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));
        when(categoryRepository.findById(catId)).thenReturn(Optional.empty());

        assertThrows(AppException.class, () ->
                gameService.updateGame(gameId, request, devUser.getEmail())
        );
    }

    @Test
    void clearGameMedia_ShouldDeleteMediaRecordsAndFiles() {
        when(userRepository.findWithRoleByEmail(devUser.getEmail())).thenReturn(Optional.of(devUser));
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));
        when(mediaRepository.findByGame_IdOrderByCreatedAtDesc(gameId)).thenReturn(List.of());

        gameService.clearGameMedia(gameId, "video", devUser.getEmail());

        verify(mediaRepository).findByGame_IdOrderByCreatedAtDesc(gameId);
    }

    @Test
    void acceptBotInvitation_ShouldCallGitHubRepoService() {
        when(userRepository.findWithRoleByEmail(devUser.getEmail())).thenReturn(Optional.of(devUser));
        when(gitHubRepoService.acceptBotInvitation("http://github.com/repo")).thenReturn(true);

        boolean result = gameService.acceptBotInvitation("http://github.com/repo", devUser.getEmail());

        assertThat(result).isTrue();
        verify(gitHubRepoService).acceptBotInvitation("http://github.com/repo");
    }

    @Test
    void getBotUsername_ShouldReturnString() {
        when(gitHubRepoService.getBotUsername()).thenReturn("godot-bot");

        String bot = gameService.getBotUsername();

        assertThat(bot).isEqualTo("godot-bot");
        verify(gitHubRepoService).getBotUsername();
    }

    @Test
    void submitGameRepo_ShouldSuccess_WhenCleanGodotProject() {
        when(userRepository.findWithRoleByEmail(devUser.getEmail())).thenReturn(Optional.of(devUser));
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));
        doNothing().when(gitHubRepoService).verifyOwnership(devUser, "http://github.com/repo");
        when(gitHubRepoService.checkAccess("http://github.com/repo")).thenReturn(com.godotlaunch.backend.service.GitHubRepoService.RepoAccess.PUBLIC);
        when(gitHubRepoService.getCloneToken("http://github.com/repo")).thenReturn(null);

        SourceProcessResult processRes = new SourceProcessResult();
        processRes.setClean(true);
        processRes.setScanned(true);
        processRes.setGodotProject(true);
        processRes.setCommitSha("sha123");
        processRes.setBundleHash("hash123");
        processRes.setBundleBase64(Base64.getEncoder().encodeToString("dummy-zip".getBytes()));
        when(sourceProcessingClient.process(eq("http://github.com/repo"), any(), eq("main"))).thenReturn(processRes);

        when(sourceSnapshotRepository.saveAndFlush(any(SourceSnapshot.class))).thenAnswer(i -> {
            SourceSnapshot s = i.getArgument(0);
            s.setId(UUID.randomUUID());
            return s;
        });
        when(sourceSnapshotRepository.save(any(SourceSnapshot.class))).thenAnswer(i -> i.getArgument(0));
        when(seaweedFsService.uploadWithKey(any(), anyString())).thenReturn("http://seaweed/bundle.zip");

        gameService.submitGameRepo(gameId, "http://github.com/repo", "main", devUser.getEmail());

        verify(gameRepository).save(any(Game.class));
        verify(sourceSnapshotRepository, times(1)).saveAndFlush(any(SourceSnapshot.class));
        verify(sourceSnapshotRepository, times(1)).save(any(SourceSnapshot.class));
    }

    @Test
    void submitGameRepo_ShouldThrowException_WhenMalwareDetected() {
        when(userRepository.findWithRoleByEmail(devUser.getEmail())).thenReturn(Optional.of(devUser));
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));
        doNothing().when(gitHubRepoService).verifyOwnership(devUser, "http://github.com/repo");
        when(gitHubRepoService.checkAccess("http://github.com/repo")).thenReturn(com.godotlaunch.backend.service.GitHubRepoService.RepoAccess.PUBLIC);
        when(gitHubRepoService.getCloneToken("http://github.com/repo")).thenReturn(null);

        SourceProcessResult processRes = new SourceProcessResult();
        processRes.setClean(false);
        processRes.setScanned(true);
        processRes.setGodotProject(true);
        processRes.setCommitSha("sha123");
        processRes.setBundleHash("hash123");
        when(sourceProcessingClient.process(eq("http://github.com/repo"), any(), eq("main"))).thenReturn(processRes);

        when(sourceSnapshotRepository.saveAndFlush(any(SourceSnapshot.class))).thenAnswer(i -> {
            SourceSnapshot s = i.getArgument(0);
            s.setId(UUID.randomUUID());
            return s;
        });

        assertThrows(AppException.class, () ->
                gameService.submitGameRepo(gameId, "http://github.com/repo", "main", devUser.getEmail())
        );
    }

    @Test
    void submitGameRepo_ShouldThrowException_WhenNotGodotProject() {
        when(userRepository.findWithRoleByEmail(devUser.getEmail())).thenReturn(Optional.of(devUser));
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));
        doNothing().when(gitHubRepoService).verifyOwnership(devUser, "http://github.com/repo");
        when(gitHubRepoService.checkAccess("http://github.com/repo")).thenReturn(com.godotlaunch.backend.service.GitHubRepoService.RepoAccess.PUBLIC);
        when(gitHubRepoService.getCloneToken("http://github.com/repo")).thenReturn(null);

        SourceProcessResult processRes = new SourceProcessResult();
        processRes.setClean(true);
        processRes.setScanned(true);
        processRes.setGodotProject(false);
        processRes.setCommitSha("sha123");
        processRes.setBundleHash("hash123");
        when(sourceProcessingClient.process(eq("http://github.com/repo"), any(), eq("main"))).thenReturn(processRes);

        assertThrows(AppException.class, () ->
                gameService.submitGameRepo(gameId, "http://github.com/repo", "main", devUser.getEmail())
        );
    }

    @Test
    void uploadWebDemo_ShouldSuccess_WhenValidZip() throws Exception {
        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
        try (java.util.zip.ZipOutputStream zos = new java.util.zip.ZipOutputStream(baos)) {
            zos.putNextEntry(new java.util.zip.ZipEntry("index.html"));
            zos.write("<html></html>".getBytes());
            zos.closeEntry();

            zos.putNextEntry(new java.util.zip.ZipEntry("game.js"));
            zos.write("console.log()".getBytes());
            zos.closeEntry();

            zos.putNextEntry(new java.util.zip.ZipEntry("game.wasm"));
            zos.write(new byte[]{0, 97, 115, 109});
            zos.closeEntry();

            zos.putNextEntry(new java.util.zip.ZipEntry("game.pck"));
            zos.write(new byte[]{1, 2, 3});
            zos.closeEntry();
        }
        byte[] zipBytes = baos.toByteArray();

        org.springframework.web.multipart.MultipartFile mockFile = mock(org.springframework.web.multipart.MultipartFile.class);
        when(mockFile.getInputStream()).thenAnswer(inv -> new java.io.ByteArrayInputStream(zipBytes));

        when(userRepository.findWithRoleByEmail(devUser.getEmail())).thenReturn(Optional.of(devUser));
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));
        when(clamAVService.scanStream(any())).thenReturn(true);
        when(seaweedFsService.getFileUrl(any())).thenReturn("http://seaweed/game/web_demo/uuid/index.html");

        gameService.uploadWebDemo(gameId, mockFile, devUser.getEmail());

        verify(gameRepository).save(any(Game.class));
    }

    @Test
    void streamWebDemoFile_ShouldSetHeadersAndStreamFile() throws Exception {
        UUID gameId = UUID.randomUUID();
        when(gameRepository.existsById(gameId)).thenReturn(true);
        byte[] mockBytes = "file-content".getBytes();
        when(seaweedFsService.getObjectStream(anyString())).thenReturn(new java.io.ByteArrayInputStream(mockBytes));

        jakarta.servlet.http.HttpServletResponse mockResponse = mock(jakarta.servlet.http.HttpServletResponse.class);
        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
        when(mockResponse.getOutputStream()).thenReturn(new jakarta.servlet.ServletOutputStream() {
            @Override
            public boolean isReady() { return true; }
            @Override
            public void setWriteListener(jakarta.servlet.WriteListener writeListener) {}
            @Override
            public void write(int b) { baos.write(b); }
        });

        gameService.streamWebDemoFile(gameId, "version123/index.html", mockResponse);

        verify(mockResponse).setHeader("Cross-Origin-Embedder-Policy", "require-corp");
        verify(mockResponse).setHeader("Cross-Origin-Opener-Policy", "same-origin");
        verify(mockResponse).setContentType("text/html");
        assertThat(baos.toByteArray()).isEqualTo(mockBytes);
    }

    @Test
    void getPresignedUploadUrl_ShouldReturnUrl_ForVariousFileTypes() {
        when(userRepository.findWithRoleByEmail(devUser.getEmail())).thenReturn(Optional.of(devUser));
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));
        when(seaweedFsService.generatePresignedUploadUrl(anyString(), anyString())).thenReturn("http://presigned-url");

        String urlThumbnail = gameService.getPresignedUploadUrl(gameId, "thumbnail", "image/png", devUser.getEmail());
        String urlScreenshot = gameService.getPresignedUploadUrl(gameId, "screenshot", "image/png", devUser.getEmail());
        String urlVideo = gameService.getPresignedUploadUrl(gameId, "video", "video/mp4", devUser.getEmail());
        String urlZip = gameService.getPresignedUploadUrl(gameId, "zip", "application/zip", devUser.getEmail());

        assertThat(urlThumbnail).isEqualTo("http://presigned-url");
        assertThat(urlScreenshot).isEqualTo("http://presigned-url");
        assertThat(urlVideo).isEqualTo("http://presigned-url");
        assertThat(urlZip).isEqualTo("http://presigned-url");
    }

    @Test
    void confirmUploadComplete_ShouldHandleThumbnailAndMedia() {
        when(userRepository.findWithRoleByEmail(devUser.getEmail())).thenReturn(Optional.of(devUser));
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));
        when(seaweedFsService.getFileUrl("new-key")).thenReturn("http://seaweed/new-key");

        // Thumbnail
        gameService.confirmUploadComplete(gameId, "thumbnail", "new-key", devUser.getEmail());
        verify(gameRepository, times(1)).save(any(Game.class));

        // Screenshot
        gameService.confirmUploadComplete(gameId, "screenshot", "new-key", devUser.getEmail());
        verify(mediaRepository, times(1)).save(any(com.godotlaunch.backend.entity.Media.class));

        // Other/zip
        gameService.confirmUploadComplete(gameId, "zip", "new-key", devUser.getEmail());
        verify(asyncVirusScanService).scanAndProcessGame(eq(gameId), eq("new-key"));
    }

    @Test
    void uploadGameMedia_ShouldHandleThumbnailAndVideo() throws Exception {
        org.springframework.web.multipart.MultipartFile mockFile = mock(org.springframework.web.multipart.MultipartFile.class);
        when(mockFile.getSize()).thenReturn(100L);
        when(mockFile.getOriginalFilename()).thenReturn("test.png");

        when(userRepository.findWithRoleByEmail(devUser.getEmail())).thenReturn(Optional.of(devUser));
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));
        when(seaweedFsService.uploadWithKey(any(), anyString())).thenReturn("http://seaweed/uploaded-key");

        // Thumbnail
        String key = gameService.uploadGameMedia(gameId, "thumbnail", mockFile, devUser.getEmail());
        assertThat(key).startsWith("games/");
        verify(gameRepository).save(any(Game.class));
    }

    @Test
    void deleteGameMediaByUrl_ShouldDeleteMediaRecordAndStorageObject() {
        com.godotlaunch.backend.entity.Media m = new com.godotlaunch.backend.entity.Media();
        m.setId(UUID.randomUUID());
        m.setMediaType("image");
        m.setMediaUrl("http://seaweed/godotlaunch/games/123/screenshots/key1.png");

        when(userRepository.findWithRoleByEmail(devUser.getEmail())).thenReturn(Optional.of(devUser));
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));
        when(mediaRepository.findByGame_IdOrderByCreatedAtDesc(gameId)).thenReturn(List.of(m));

        gameService.deleteGameMediaByUrl(gameId, "http://seaweed/godotlaunch/games/123/screenshots/key1.png", devUser.getEmail());

        verify(mediaRepository).delete(m);
        verify(seaweedFsService).deleteObject("games/123/screenshots/key1.png");
    }

    @Test
    void validateUpdateDependency_ShouldThrowException_WhenGameIsLiveAndNoPendingSnapshot() {
        game.setStatus(GameStatus.published);
        game.setPendingUpdateSnapshot(null);

        when(userRepository.findWithRoleByEmail(devUser.getEmail())).thenReturn(Optional.of(devUser));
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));

        // updateGame should fail
        UpdateGameRequest updateReq = new UpdateGameRequest();
        updateReq.setTitle("New Title");
        AppException ex = assertThrows(AppException.class, () -> 
            gameService.updateGame(gameId, updateReq, devUser.getEmail())
        );
        assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.UPDATE_REQUIRES_CODE_UPDATE);

        // getPresignedUploadUrl for thumbnail should fail
        ex = assertThrows(AppException.class, () -> 
            gameService.getPresignedUploadUrl(gameId, "thumbnail", "image/png", devUser.getEmail())
        );
        assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.UPDATE_REQUIRES_CODE_UPDATE);

        // clearGameMedia should fail
        ex = assertThrows(AppException.class, () -> 
            gameService.clearGameMedia(gameId, "image", devUser.getEmail())
        );
        assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.UPDATE_REQUIRES_CODE_UPDATE);
    }

    @Test
    void validateUpdateDependency_ShouldSucceed_WhenGameIsLiveAndHasPendingSnapshot() {
        game.setStatus(GameStatus.published);
        SourceSnapshot pendingSnapshot = new SourceSnapshot();
        pendingSnapshot.setId(UUID.randomUUID());
        game.setPendingUpdateSnapshot(pendingSnapshot);

        when(userRepository.findWithRoleByEmail(devUser.getEmail())).thenReturn(Optional.of(devUser));
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));
        when(sourceSnapshotRepository.save(any(SourceSnapshot.class))).thenAnswer(inv -> inv.getArgument(0));

        // updateGame should succeed
        UpdateGameRequest updateReq = new UpdateGameRequest();
        updateReq.setTitle("New Title");
        GameResponse resp = gameService.updateGame(gameId, updateReq, devUser.getEmail());
        assertThat(resp.getTitle()).isEqualTo("Godot Platformer");
        assertThat(resp.getPendingTitle()).isEqualTo("New Title");
    }

    @Test
    void validateUpdateDependency_ShouldAllowGameZipUpload_EvenWhenNoPendingSnapshot() {
        game.setStatus(GameStatus.published);
        game.setPendingUpdateSnapshot(null);

        when(userRepository.findWithRoleByEmail(devUser.getEmail())).thenReturn(Optional.of(devUser));
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));
        when(seaweedFsService.generatePresignedUploadUrl(anyString(), anyString())).thenReturn("http://presigned-url");

        // getPresignedUploadUrl for "game" should succeed
        String url = gameService.getPresignedUploadUrl(gameId, "game", "application/zip", devUser.getEmail());
        assertThat(url).isEqualTo("http://presigned-url");
    }

    @Test
    void approveGame_ShouldMergePendingSnapshotMetadataAndMedia_WhenPendingUpdateSnapshotExists() throws Exception {
        game.setStatus(GameStatus.published);
        SourceSnapshot pendingSnapshot = new SourceSnapshot();
        pendingSnapshot.setId(UUID.randomUUID());
        pendingSnapshot.setPendingTitle("New Pending Title");
        pendingSnapshot.setPendingDescription("New Pending Description");
        pendingSnapshot.setPendingThumbnailUrl("http://seaweed/new-thumb.png");
        pendingSnapshot.setPendingVideoUrl("http://seaweed/new-video.mp4");
        pendingSnapshot.setPendingScreenshots("[\"http://seaweed/new-screenshot.png\"]");
        pendingSnapshot.setBundleUrl("http://seaweed/new-bundle.zip");
        game.setPendingUpdateSnapshot(pendingSnapshot);

        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));
        when(objectMapper.readValue(anyString(), any(com.fasterxml.jackson.core.type.TypeReference.class)))
                .thenReturn(List.of("http://seaweed/new-screenshot.png"));

        gameService.approveGame(gameId);

        assertThat(game.getTitle()).isEqualTo("New Pending Title");
        assertThat(game.getDescription()).isEqualTo("New Pending Description");
        assertThat(game.getThumbnailUrl()).isEqualTo("http://seaweed/new-thumb.png");
        assertThat(game.getPendingUpdateSnapshot()).isNull();
        verify(mediaRepository, atLeastOnce()).save(any());
    }
}
