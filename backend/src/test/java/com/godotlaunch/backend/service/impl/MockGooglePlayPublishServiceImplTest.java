package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.entity.ExternalPublish;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.GameVersion;
import com.godotlaunch.backend.entity.enums.ExtStatus;
import com.godotlaunch.backend.repository.ExternalPublishRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MockGooglePlayPublishServiceImplTest {

    @Mock
    private ExternalPublishRepository externalPublishRepository;

    @InjectMocks
    private MockGooglePlayPublishServiceImpl service;

    private GameVersion version;
    private Game game;

    @BeforeEach
    void setUp() {
        game = new Game();
        game.setId(UUID.randomUUID());
        game.setTitle("Mock Game");

        version = new GameVersion();
        version.setId(UUID.randomUUID());
        version.setGame(game);
        version.setVersionNumber("1.0.0");

        ReflectionTestUtils.setField(service, "mockReviewDelaySeconds", 30L);
    }

    @Test
    void publishGameToStore_ShouldSaveAndReturnSubmittedPublish() {
        when(externalPublishRepository.save(any(ExternalPublish.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ExternalPublish result = service.publishGameToStore(
                version, "Short desc", "http://graphic", Collections.singletonList("http://screenshot"));

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(ExtStatus.submitted);
        assertThat(result.getExternalAppId()).startsWith("mock.godotlaunch.");
        verify(externalPublishRepository, times(1)).save(result);
    }

    @Test
    void checkReviewStatus_ShouldDoNothing_WhenSubmittedAtIsNull() {
        ExternalPublish publish = new ExternalPublish();
        publish.setSubmittedAt(null);
        publish.setStatus(ExtStatus.submitted);

        service.checkReviewStatus(publish);

        assertThat(publish.getStatus()).isEqualTo(ExtStatus.submitted);
    }

    @Test
    void checkReviewStatus_ShouldDoNothing_WhenDelayNotElapsed() {
        ExternalPublish publish = new ExternalPublish();
        publish.setSubmittedAt(Instant.now().minus(10, ChronoUnit.SECONDS));
        publish.setStatus(ExtStatus.submitted);

        service.checkReviewStatus(publish);

        assertThat(publish.getStatus()).isEqualTo(ExtStatus.submitted);
    }

    @Test
    void checkReviewStatus_ShouldSetLive_WhenDelayElapsed() {
        ExternalPublish publish = new ExternalPublish();
        publish.setSubmittedAt(Instant.now().minus(40, ChronoUnit.SECONDS));
        publish.setStatus(ExtStatus.submitted);
        publish.setExternalAppId("mock.app.id");
        publish.setGame(game);
        publish.setGameVersion(version);

        service.checkReviewStatus(publish);

        assertThat(publish.getStatus()).isEqualTo(ExtStatus.live);
        assertThat(publish.getLiveAt()).isNotNull();
        assertThat(publish.getStoreUrl()).contains("details?id=mock.app.id");
    }
}
