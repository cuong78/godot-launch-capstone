package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.config.GitHubOAuthConfig;
import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.service.GitHubRepoService.RepoAccess;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GitHubRepoServiceImplTest {

    @Mock
    private GitHubOAuthConfig githubConfig;

    @Mock
    private WebClient webClient;

    @Mock
    private WebClient.RequestHeadersUriSpec requestHeadersUriSpec;

    @Mock
    private WebClient.RequestHeadersSpec requestHeadersSpec;

    @Mock
    private WebClient.ResponseSpec responseSpec;

    @InjectMocks
    private GitHubRepoServiceImpl gitHubRepoService;

    private User user;
    private String repoUrl;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setGithubUsername("test-user");
        repoUrl = "https://github.com/test-user/test-repo.git";
    }

    @Test
    @DisplayName("shouldThrowException_WhenGithubNotLinked")
    void shouldThrowException_WhenGithubNotLinked() {
        user.setGithubUsername(null);
        assertThatThrownBy(() -> gitHubRepoService.verifyOwnership(user, repoUrl))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.GITHUB_NOT_LINKED);
    }

    @Test
    @DisplayName("shouldThrowException_WhenRepoUrlEmpty")
    void shouldThrowException_WhenRepoUrlEmpty() {
        assertThatThrownBy(() -> gitHubRepoService.verifyOwnership(user, ""))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.REPO_URL_REQUIRED);
    }

    @Test
    @DisplayName("shouldThrowException_WhenOwnerMismatch")
    void shouldThrowException_WhenOwnerMismatch() {
        String otherRepo = "https://github.com/other-user/test-repo.git";
        assertThatThrownBy(() -> gitHubRepoService.verifyOwnership(user, otherRepo))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.REPO_OWNER_MISMATCH);
    }

    @Test
    @DisplayName("shouldVerifyOwnership_WhenRepoIsPublicAndValid")
    void shouldVerifyOwnership_WhenRepoIsPublicAndValid() {
        Map<String, Object> repoData = new HashMap<>();
        repoData.put("fork", false);
        repoData.put("owner", Map.of("login", "test-user"));

        when(githubConfig.getBotToken()).thenReturn("bot-token");
        when(webClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(any(URI.class))).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.header(anyString(), anyString())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class))).thenReturn(Mono.just(repoData));

        gitHubRepoService.verifyOwnership(user, repoUrl);

        verify(githubConfig, times(1)).getBotToken();
    }

    @Test
    @DisplayName("shouldReturnPublicAccess_WhenRepoIsPublic")
    void shouldReturnPublicAccess_WhenRepoIsPublic() {
        Map<String, Object> repoData = new HashMap<>();
        repoData.put("private", false);

        when(webClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(any(URI.class))).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.header(anyString(), anyString())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class))).thenReturn(Mono.just(repoData));

        RepoAccess access = gitHubRepoService.checkAccess(repoUrl);

        assertThat(access).isEqualTo(RepoAccess.PUBLIC);
    }

    @Test
    @DisplayName("shouldReturnPrivateNoAccess_WhenRepoNotFoundAndNotAuthenticated")
    void shouldReturnPrivateNoAccess_WhenRepoNotFoundAndNotAuthenticated() {
        when(webClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(any(URI.class))).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.header(anyString(), anyString())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class))).thenReturn(Mono.empty());

        RepoAccess access = gitHubRepoService.checkAccess(repoUrl);

        assertThat(access).isEqualTo(RepoAccess.PRIVATE_NO_ACCESS);
    }

    @Test
    void verifyOwnership_ShouldThrowException_WhenRepoIsFork() {
        Map<String, Object> repoData = new HashMap<>();
        repoData.put("fork", true);
        repoData.put("owner", Map.of("login", "test-user"));

        when(githubConfig.getBotToken()).thenReturn("bot-token");
        when(webClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(any(URI.class))).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.header(anyString(), anyString())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class))).thenReturn(Mono.just(repoData));

        assertThatThrownBy(() -> gitHubRepoService.verifyOwnership(user, repoUrl))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.REPO_IS_FORK);
    }

    @Test
    void verifyOwnership_ShouldThrowException_WhenApiOwnerMismatch() {
        Map<String, Object> repoData = new HashMap<>();
        repoData.put("fork", false);
        repoData.put("owner", Map.of("login", "other-user"));

        when(githubConfig.getBotToken()).thenReturn("bot-token");
        when(webClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(any(URI.class))).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.header(anyString(), anyString())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class))).thenReturn(Mono.just(repoData));

        assertThatThrownBy(() -> gitHubRepoService.verifyOwnership(user, repoUrl))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.REPO_OWNER_MISMATCH);
    }

    @Test
    void checkAccess_ShouldReturnPublic_WhenPublicRepoPageAccessible() {
        // First try to fetch metadata fails (returns null)
        when(webClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(any(URI.class))).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.header(anyString(), anyString())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class))).thenReturn(Mono.empty());

        // Then fallback isPublicRepoPageAccessible is called.
        // It calls webClient.get() -> uri(https://github.com/test-user/test-repo) -> exchangeToMono
        // Let's mock webClient.get() to return requestHeadersUriSpec.
        // And then uri(https://github.com/...) returns requestHeadersSpec.
        // And then exchangeToMono is called.
        WebClient.RequestHeadersSpec headersSpecMock = mock(WebClient.RequestHeadersSpec.class);
        when(requestHeadersUriSpec.uri(URI.create("https://github.com/test-user/test-repo"))).thenReturn(headersSpecMock);
        when(headersSpecMock.exchangeToMono(any())).thenReturn(Mono.just(true));

        RepoAccess access = gitHubRepoService.checkAccess(repoUrl);

        assertThat(access).isEqualTo(RepoAccess.PUBLIC);
    }

    @Test
    void acceptBotInvitation_ShouldReturnFalse_WhenNoBotToken() {
        when(githubConfig.getBotToken()).thenReturn(null);
        boolean result = gitHubRepoService.acceptBotInvitation(repoUrl);
        assertThat(result).isFalse();
    }

    @Test
    @SuppressWarnings("unchecked")
    void acceptBotInvitation_ShouldSucceed_WhenInvitationPending() {
        when(githubConfig.getBotToken()).thenReturn("bot-token");

        // mock list invitations
        when(webClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri("https://api.github.com/user/repository_invitations")).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.header(anyString(), anyString())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        
        Map<String, Object> invitation = new HashMap<>();
        invitation.put("id", 12345L);
        invitation.put("repository", Map.of("full_name", "test-user/test-repo"));
        
        when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class))).thenReturn(Mono.just(List.of(invitation)));

        // mock patch accept invitation
        WebClient.RequestBodyUriSpec requestBodyUriSpecMock = mock(WebClient.RequestBodyUriSpec.class);
        WebClient.RequestBodySpec requestBodySpecMock = mock(WebClient.RequestBodySpec.class);
        when(webClient.patch()).thenReturn(requestBodyUriSpecMock);
        when(requestBodyUriSpecMock.uri("https://api.github.com/user/repository_invitations/12345")).thenReturn(requestBodySpecMock);
        when(requestBodySpecMock.header(anyString(), anyString())).thenReturn(requestBodySpecMock);
        when(requestBodySpecMock.retrieve()).thenReturn(responseSpec);
        when(responseSpec.toBodilessEntity()).thenReturn(Mono.empty());

        boolean result = gitHubRepoService.acceptBotInvitation(repoUrl);

        assertThat(result).isTrue();
    }

    @Test
    void getCloneToken_ShouldReturnToken_WhenPrivate() {
        // mock private access
        Map<String, Object> repoData = new HashMap<>();
        repoData.put("private", true);

        when(webClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(any(URI.class))).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.header(anyString(), anyString())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class))).thenReturn(Mono.just(repoData));

        when(githubConfig.getBotToken()).thenReturn("bot-token");

        String token = gitHubRepoService.getCloneToken(repoUrl);

        assertThat(token).isEqualTo("bot-token");
    }

    @Test
    void getBotUsername_ShouldReturnUsername() {
        when(githubConfig.getBotUsername()).thenReturn("bot-user");
        String username = gitHubRepoService.getBotUsername();
        assertThat(username).isEqualTo("bot-user");
    }

    @Test
    void verifyOwnership_ShouldThrowException_WhenRepoUrlInvalid() {
        assertThatThrownBy(() -> gitHubRepoService.verifyOwnership(user, "https://invalid-host.com/test-user/repo"))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.REPO_URL_REQUIRED);
    }
}
