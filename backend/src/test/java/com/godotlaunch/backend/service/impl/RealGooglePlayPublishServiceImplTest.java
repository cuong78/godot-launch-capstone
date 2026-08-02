package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.entity.ExternalPublish;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.GameVersion;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.enums.ExtStatus;
import com.godotlaunch.backend.repository.ExternalPublishRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.UUID;
import java.util.Date;
import java.util.Map;
import java.util.List;
import java.io.File;
import java.io.FileWriter;
import java.io.InputStream;
import org.mockito.MockedStatic;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.AccessToken;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RealGooglePlayPublishServiceImplTest {

    @Mock
    private ExternalPublishRepository externalPublishRepository;

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private RealGooglePlayPublishServiceImpl service;

    private GameVersion version;
    private Game game;

    @BeforeEach
    void setUp() {
        game = new Game();
        game.setId(UUID.randomUUID());
        game.setTitle("Test Game");
        game.setDescription("Desc");
        
        User creator = new User();
        creator.setEmail("dev@example.com");
        game.setCreator(creator);

        version = new GameVersion();
        version.setId(UUID.randomUUID());
        version.setGame(game);
        version.setVersionNumber("1.0.0");
        version.setFileUrl("http://some-file.aab");

        ReflectionTestUtils.setField(service, "restTemplate", restTemplate);
        ReflectionTestUtils.setField(service, "serviceAccountPath", "invalid-path-to-json");
        ReflectionTestUtils.setField(service, "packageName", "com.test.app");
        ReflectionTestUtils.setField(service, "track", "production");
    }

    @Test
    void publishGameToStore_ShouldReject_WhenCredentialsInvalid() {
        when(externalPublishRepository.save(any(ExternalPublish.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ExternalPublish result = service.publishGameToStore(
                version, "Short desc", "http://feature.png", Collections.singletonList("http://screenshot1.png"));

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(ExtStatus.rejected);
        assertThat(result.getRejectedReason()).contains("Lỗi gọi Google Play API");
    }

    @Test
    void checkReviewStatus_ShouldSetLive_WhenStorePageExists() {
        ExternalPublish publish = new ExternalPublish();
        publish.setExternalAppId("com.test.app");
        publish.setGame(game);
        publish.setGameVersion(version);
        publish.setStatus(ExtStatus.submitted);

        ResponseEntity<String> response = new ResponseEntity<>("HTML content", HttpStatus.OK);
        when(restTemplate.getForEntity(eq("https://play.google.com/store/apps/details?id=com.test.app"), eq(String.class)))
                .thenReturn(response);

        service.checkReviewStatus(publish);

        assertThat(publish.getStatus()).isEqualTo(ExtStatus.live);
        assertThat(publish.getStoreUrl()).isEqualTo("https://play.google.com/store/apps/details?id=com.test.app");
        assertThat(publish.getLiveAt()).isNotNull();
    }

    @Test
    void checkReviewStatus_ShouldRemainSubmitted_WhenStorePageReturnsError() {
        ExternalPublish publish = new ExternalPublish();
        publish.setExternalAppId("com.test.app");
        publish.setStatus(ExtStatus.submitted);
        publish.setGame(game);
        publish.setGameVersion(version);

        when(restTemplate.getForEntity(eq("https://play.google.com/store/apps/details?id=com.test.app"), eq(String.class)))
                .thenThrow(new RestClientException("Not found"));

        service.checkReviewStatus(publish);

        assertThat(publish.getStatus()).isEqualTo(ExtStatus.submitted);
        assertThat(publish.getStoreUrl()).isNull();
    }

    @Test
    void publishGameToStore_ShouldSuccess() throws Exception {
        // Create dummy service account file
        File tempFile = File.createTempFile("service-account", ".json");
        tempFile.deleteOnExit();
        try (FileWriter writer = new FileWriter(tempFile)) {
            writer.write("{}");
        }
        ReflectionTestUtils.setField(service, "serviceAccountPath", tempFile.getAbsolutePath());
        game.setThumbnailUrl("http://thumbnail.png");

        when(externalPublishRepository.save(any(ExternalPublish.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // Mock static GoogleCredentials
        try (MockedStatic<GoogleCredentials> mockedCredentials = mockStatic(GoogleCredentials.class)) {
            GoogleCredentials creds = mock(GoogleCredentials.class);
            AccessToken token = new AccessToken("mock-token", Date.from(java.time.Instant.now().plusSeconds(3600)));
            when(creds.createScoped(any(java.util.Collection.class))).thenReturn(creds);
            when(creds.getAccessToken()).thenReturn(token);
            mockedCredentials.when(() -> GoogleCredentials.fromStream(any(InputStream.class))).thenReturn(creds);

            // Stub restTemplate calls
            when(restTemplate.postForObject(org.mockito.ArgumentMatchers.contains("/edits"), any(HttpEntity.class), eq(Map.class)))
                    .thenReturn(Map.of("id", "edit-123"));

            when(restTemplate.getForObject(eq("http://some-file.aab"), eq(byte[].class)))
                    .thenReturn(new byte[]{1, 2, 3});

            ResponseEntity<Map> bundleResponse = new ResponseEntity<>(Map.of("versionCode", 45), HttpStatus.OK);
            when(restTemplate.exchange(org.mockito.ArgumentMatchers.contains("/bundles?uploadType=media"), eq(HttpMethod.POST), any(HttpEntity.class), eq(Map.class)))
                    .thenReturn(bundleResponse);

            ResponseEntity<Map> listingResponse = new ResponseEntity<>(Map.of(), HttpStatus.OK);
            when(restTemplate.exchange(org.mockito.ArgumentMatchers.contains("/listings/en-US"), eq(HttpMethod.PUT), any(HttpEntity.class), eq(Map.class)))
                    .thenReturn(listingResponse);

            when(restTemplate.getForObject(eq("http://thumbnail.png"), eq(byte[].class))).thenReturn(new byte[]{1});
            when(restTemplate.getForObject(eq("http://feature.png"), eq(byte[].class))).thenReturn(new byte[]{2});
            when(restTemplate.getForObject(eq("http://screenshot1.png"), eq(byte[].class))).thenReturn(new byte[]{3});

            ResponseEntity<Map> imageResponse = new ResponseEntity<>(Map.of(), HttpStatus.OK);
            when(restTemplate.exchange(org.mockito.ArgumentMatchers.contains("/images/"), eq(HttpMethod.POST), any(HttpEntity.class), eq(Map.class)))
                    .thenReturn(imageResponse);

            ResponseEntity<Map> detailsResponse = new ResponseEntity<>(Map.of(), HttpStatus.OK);
            when(restTemplate.exchange(org.mockito.ArgumentMatchers.contains("/details"), eq(HttpMethod.PUT), any(HttpEntity.class), eq(Map.class)))
                    .thenReturn(detailsResponse);

            ResponseEntity<Map> trackResponse = new ResponseEntity<>(Map.of(), HttpStatus.OK);
            when(restTemplate.exchange(org.mockito.ArgumentMatchers.contains("/tracks/"), eq(HttpMethod.PUT), any(HttpEntity.class), eq(Map.class)))
                    .thenReturn(trackResponse);

            when(restTemplate.postForObject(org.mockito.ArgumentMatchers.contains(":commit"), any(HttpEntity.class), eq(Map.class)))
                    .thenReturn(Map.of());

            ExternalPublish result = service.publishGameToStore(
                    version, "Short desc", "http://feature.png", List.of("http://screenshot1.png"));

            assertThat(result).isNotNull();
            assertThat(result.getStatus()).isEqualTo(ExtStatus.submitted);
            assertThat(result.getExternalAppId()).isEqualTo("com.test.app");
            assertThat(result.getSubmittedAt()).isNotNull();
        }
    }
}
