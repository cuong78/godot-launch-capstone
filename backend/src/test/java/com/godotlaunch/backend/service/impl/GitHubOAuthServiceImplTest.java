package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.config.GitHubOAuthConfig;
import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.entity.Role;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.RoleRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.security.JwtProvider;
import com.godotlaunch.backend.service.EncryptionService;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GitHubOAuthServiceImplTest {

    @Mock
    private GitHubOAuthConfig githubConfig;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private JwtProvider jwtProvider;

    @Mock
    private EncryptionService encryptionService;

    @Mock
    private WebClient webClient;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private HttpSession session;

    @InjectMocks
    private GitHubOAuthServiceImpl gitHubOAuthService;

    @Mock
    private WebClient.RequestBodyUriSpec requestBodyUriSpec;

    @Mock
    private WebClient.RequestBodySpec requestBodySpec;

    @Mock
    private WebClient.RequestHeadersUriSpec requestHeadersUriSpec;

    @Mock
    private WebClient.RequestHeadersSpec requestHeadersSpec;

    @Mock
    private WebClient.ResponseSpec responseSpec;

    @Mock
    private Mono<com.godotlaunch.backend.dto.response.GitHubTokenResponse> tokenMono;

    @Mock
    private Mono<com.godotlaunch.backend.dto.response.GitHubUserProfile> profileMono;

    @Mock
    private Mono<List<Map<String, Object>>> emailsMono;

    private User mockUser;
    private Role customerRole;
    private Role developerRole;

    @BeforeEach
    void setUp() {
        customerRole = new Role();
        customerRole.setId(UUID.randomUUID());
        customerRole.setName("customer");

        developerRole = new Role();
        developerRole.setId(UUID.randomUUID());
        developerRole.setName("developer");

        mockUser = new User();
        mockUser.setId(UUID.randomUUID());
        mockUser.setEmail("user@example.com");
        mockUser.setRole(customerRole);
        mockUser.setStatus("active");

        lenient().when(githubConfig.getClientId()).thenReturn("dummy-client-id");
        lenient().when(githubConfig.getClientSecret()).thenReturn("dummy-client-secret");
    }

    @Test
    @DisplayName("Should build GitHub authorization URL and set state in session")
    void shouldBuildAuthorizationUrl_Successfully() {
        // Arrange
        when(githubConfig.getClientId()).thenReturn("github-client-123");
        when(githubConfig.getRedirectUri()).thenReturn("http://localhost:8080/api/v1/auth/github/callback");

        // Act
        String url = gitHubOAuthService.buildAuthorizationUrl(session);

        // Assert
        assertThat(url).contains("https://github.com/login/oauth/authorize");
        assertThat(url).contains("client_id=github-client-123");
        assertThat(url).contains("scope=user:email");
        verify(session, times(1)).setAttribute(eq("github_oauth_state"), any(String.class));
    }

    @Test
    @DisplayName("Should prepare link session successfully for customer role")
    void shouldPrepareLinkSession_Successfully_ForCustomer() {
        // Arrange
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(mockUser));

        // Act
        String linkUrl = gitHubOAuthService.prepareLinkSession("user@example.com", session);

        // Assert
        assertThat(linkUrl).isEqualTo("http://localhost:8080/api/v1/auth/github?action=link");
        verify(session, times(1)).setAttribute("github_linking_user_email", "user@example.com");
    }

    @Test
    @DisplayName("Should use configured backend URL when preparing GitHub link session")
    void shouldPrepareLinkSession_UseConfiguredBackendUrl() {
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(mockUser));
        ReflectionTestUtils.setField(gitHubOAuthService, "backendUrl", "https://godotlaunch.shop/");

        String linkUrl = gitHubOAuthService.prepareLinkSession("user@example.com", session);

        assertThat(linkUrl).isEqualTo("https://godotlaunch.shop/api/v1/auth/github?action=link");
    }

    @Test
    @DisplayName("Should throw ACCESS_DENIED on prepareLinkSession when user is already a developer")
    void shouldThrowAccessDenied_WhenUserIsDeveloper() {
        // Arrange
        mockUser.setRole(developerRole);
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(mockUser));

        // Act & Assert
        assertThatThrownBy(() -> gitHubOAuthService.prepareLinkSession("user@example.com", session))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("Should throw GITHUB_AUTH_FAILED when stored state does not match callback state")
    void shouldThrowException_WhenStateMismatchOnCallback() {
        // Arrange
        when(session.getAttribute("github_oauth_state")).thenReturn("valid-state");

        // Act & Assert
        assertThatThrownBy(() -> gitHubOAuthService.handleCallback("code123", "mismatched-state", session))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.GITHUB_AUTH_FAILED);
    }

    @Test
    @DisplayName("Should throw GITHUB_TOKEN_EXCHANGE_FAILED when code is missing")
    void shouldThrowException_WhenCodeIsMissingOnCallback() {
        // Arrange
        when(session.getAttribute("github_oauth_state")).thenReturn("valid-state");

        // Act & Assert
        assertThatThrownBy(() -> gitHubOAuthService.handleCallback(null, "valid-state", session))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.GITHUB_TOKEN_EXCHANGE_FAILED);
    }

    private void mockWebClientPost(com.godotlaunch.backend.dto.response.GitHubTokenResponse tokenResponse) {
        when(webClient.post()).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.uri(any(String.class))).thenReturn(requestBodySpec);
        when(requestBodySpec.header(any(String.class), any(String.class))).thenReturn(requestBodySpec);
        when(requestBodySpec.contentType(any())).thenReturn(requestBodySpec);
        when(requestBodySpec.bodyValue(any())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.bodyToMono(com.godotlaunch.backend.dto.response.GitHubTokenResponse.class)).thenReturn(tokenMono);
        when(tokenMono.block()).thenReturn(tokenResponse);
    }

    private void mockWebClientGetProfile(com.godotlaunch.backend.dto.response.GitHubUserProfile profile) {
        lenient().when(webClient.get()).thenReturn(requestHeadersUriSpec);
        lenient().when(requestHeadersUriSpec.uri(eq("https://api.github.com/user"))).thenReturn(requestHeadersSpec);
        lenient().when(requestHeadersSpec.header(any(String.class), any(String.class))).thenReturn(requestHeadersSpec);
        lenient().when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        lenient().when(responseSpec.bodyToMono(com.godotlaunch.backend.dto.response.GitHubUserProfile.class)).thenReturn(profileMono);
        lenient().when(profileMono.block()).thenReturn(profile);
    }

    private void mockWebClientGetEmails(List<Map<String, Object>> emailsList) {
        lenient().when(webClient.get()).thenReturn(requestHeadersUriSpec);
        lenient().when(requestHeadersUriSpec.uri(eq("https://api.github.com/user/emails"))).thenReturn(requestHeadersSpec);
        lenient().when(requestHeadersSpec.header(any(String.class), any(String.class))).thenReturn(requestHeadersSpec);
        lenient().when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        lenient().when(responseSpec.bodyToMono(any(org.springframework.core.ParameterizedTypeReference.class))).thenReturn(emailsMono);
        lenient().when(emailsMono.block()).thenReturn(emailsList);
    }

    @Test
    void handleCallback_ShouldThrowException_WhenTokenRetrievalThrows() {
        when(session.getAttribute("github_oauth_state")).thenReturn("valid-state");
        when(webClient.post()).thenThrow(new RuntimeException("API down"));

        assertThatThrownBy(() -> gitHubOAuthService.handleCallback("code123", "valid-state", session))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.GITHUB_TOKEN_EXCHANGE_FAILED);
    }

    @Test
    void handleCallback_ShouldThrowException_WhenProfileRetrievalThrows() {
        when(session.getAttribute("github_oauth_state")).thenReturn("valid-state");
        com.godotlaunch.backend.dto.response.GitHubTokenResponse tokenRes = new com.godotlaunch.backend.dto.response.GitHubTokenResponse();
        tokenRes.setAccessToken("token");
        mockWebClientPost(tokenRes);

        when(webClient.get()).thenThrow(new RuntimeException("API down"));

        assertThatThrownBy(() -> gitHubOAuthService.handleCallback("code123", "valid-state", session))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.GITHUB_AUTH_FAILED);
    }

    @Test
    void handleCallback_ShouldCreateNewUser_WhenUserNotExists() {
        when(session.getAttribute("github_oauth_state")).thenReturn("valid-state");
        com.godotlaunch.backend.dto.response.GitHubTokenResponse tokenRes = new com.godotlaunch.backend.dto.response.GitHubTokenResponse();
        tokenRes.setAccessToken("token");
        mockWebClientPost(tokenRes);

        com.godotlaunch.backend.dto.response.GitHubUserProfile profile = new com.godotlaunch.backend.dto.response.GitHubUserProfile();
        profile.setId("123456");
        profile.setLogin("testuser");
        profile.setName("Test User");
        profile.setEmail("test@example.com");
        profile.setAvatarUrl("http://avatar");
        mockWebClientGetProfile(profile);

        when(encryptionService.encrypt("token")).thenReturn("encToken");
        when(userRepository.findByGithubId("123456")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("hashedPass");
        when(roleRepository.findByName("customer")).thenReturn(Optional.of(customerRole));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtProvider.generateToken(any(), any(), any(), any())).thenReturn("mockJwtToken");

        String jwt = gitHubOAuthService.handleCallback("code123", "valid-state", session);

        assertThat(jwt).isEqualTo("mockJwtToken");
    }

    @Test
    void handleCallback_ShouldThrowException_WhenUserBanned() {
        when(session.getAttribute("github_oauth_state")).thenReturn("valid-state");
        com.godotlaunch.backend.dto.response.GitHubTokenResponse tokenRes = new com.godotlaunch.backend.dto.response.GitHubTokenResponse();
        tokenRes.setAccessToken("token");
        mockWebClientPost(tokenRes);

        com.godotlaunch.backend.dto.response.GitHubUserProfile profile = new com.godotlaunch.backend.dto.response.GitHubUserProfile();
        profile.setId("123456");
        profile.setLogin("testuser");
        profile.setEmail("test@example.com");
        mockWebClientGetProfile(profile);

        User bannedUser = new User();
        bannedUser.setId(UUID.randomUUID());
        bannedUser.setStatus("banned");

        when(encryptionService.encrypt("token")).thenReturn("encToken");
        when(userRepository.findByGithubId("123456")).thenReturn(Optional.of(bannedUser));

        assertThatThrownBy(() -> gitHubOAuthService.handleCallback("code123", "valid-state", session))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.USER_BANNED);
    }

    @Test
    void handleCallback_ShouldLinkFlow_Success() {
        when(session.getAttribute("github_oauth_state")).thenReturn("valid-state");
        when(session.getAttribute("github_linking_user_email")).thenReturn("user@example.com");

        com.godotlaunch.backend.dto.response.GitHubTokenResponse tokenRes = new com.godotlaunch.backend.dto.response.GitHubTokenResponse();
        tokenRes.setAccessToken("token");
        mockWebClientPost(tokenRes);

        com.godotlaunch.backend.dto.response.GitHubUserProfile profile = new com.godotlaunch.backend.dto.response.GitHubUserProfile();
        profile.setId("123456");
        profile.setLogin("testuser");
        mockWebClientGetProfile(profile);

        when(encryptionService.encrypt("token")).thenReturn("encToken");
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(mockUser));

        Map<String, Object> emailMap = new HashMap<>();
        emailMap.put("email", "user@example.com");
        emailMap.put("primary", true);
        emailMap.put("verified", true);
        mockWebClientGetEmails(Collections.singletonList(emailMap));

        when(userRepository.findByGithubId("123456")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtProvider.generateToken(any(), any(), any(), any())).thenReturn("linkedJwtToken");

        String jwt = gitHubOAuthService.handleCallback("code123", "valid-state", session);

        assertThat(jwt).isEqualTo("linkedJwtToken");
        verify(session, times(1)).removeAttribute("github_linking_user_email");
    }

    @Test
    void handleCallback_ShouldLinkFlow_ThrowMismatch_WhenEmailsDiffer() {
        when(session.getAttribute("github_oauth_state")).thenReturn("valid-state");
        when(session.getAttribute("github_linking_user_email")).thenReturn("user@example.com");

        com.godotlaunch.backend.dto.response.GitHubTokenResponse tokenRes = new com.godotlaunch.backend.dto.response.GitHubTokenResponse();
        tokenRes.setAccessToken("token");
        mockWebClientPost(tokenRes);

        com.godotlaunch.backend.dto.response.GitHubUserProfile profile = new com.godotlaunch.backend.dto.response.GitHubUserProfile();
        profile.setId("123456");
        mockWebClientGetProfile(profile);

        when(encryptionService.encrypt("token")).thenReturn("encToken");
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(mockUser));

        Map<String, Object> emailMap = new HashMap<>();
        emailMap.put("email", "differ@example.com");
        emailMap.put("primary", true);
        emailMap.put("verified", true);
        mockWebClientGetEmails(Collections.singletonList(emailMap));

        assertThatThrownBy(() -> gitHubOAuthService.handleCallback("code123", "valid-state", session))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.GITHUB_EMAIL_MISMATCH);
    }

    @Test
    void handleCallback_ShouldThrowException_WhenStateMismatch() {
        when(session.getAttribute("github_oauth_state")).thenReturn("mismatch-state");

        assertThatThrownBy(() -> gitHubOAuthService.handleCallback("code123", "valid-state", session))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.GITHUB_AUTH_FAILED);
    }

    @Test
    void handleCallback_ShouldThrowException_WhenCodeEmpty() {
        when(session.getAttribute("github_oauth_state")).thenReturn("valid-state");

        assertThatThrownBy(() -> gitHubOAuthService.handleCallback("", "valid-state", session))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.GITHUB_TOKEN_EXCHANGE_FAILED);
    }

    @Test
    void handleCallback_ShouldThrowException_WhenTokenExchangeFails() {
        when(session.getAttribute("github_oauth_state")).thenReturn("valid-state");
        when(webClient.post()).thenThrow(new RuntimeException("API error"));

        assertThatThrownBy(() -> gitHubOAuthService.handleCallback("code123", "valid-state", session))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.GITHUB_TOKEN_EXCHANGE_FAILED);
    }

    @Test
    void handleCallback_ShouldThrowException_WhenTokenResponseNull() {
        when(session.getAttribute("github_oauth_state")).thenReturn("valid-state");
        mockWebClientPost(null);

        assertThatThrownBy(() -> gitHubOAuthService.handleCallback("code123", "valid-state", session))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.GITHUB_TOKEN_EXCHANGE_FAILED);
    }

    @Test
    void handleCallback_ShouldThrowException_WhenProfileFetchFails() {
        when(session.getAttribute("github_oauth_state")).thenReturn("valid-state");
        com.godotlaunch.backend.dto.response.GitHubTokenResponse tokenRes = new com.godotlaunch.backend.dto.response.GitHubTokenResponse();
        tokenRes.setAccessToken("token");
        mockWebClientPost(tokenRes);
        when(webClient.get()).thenThrow(new RuntimeException("API error"));

        assertThatThrownBy(() -> gitHubOAuthService.handleCallback("code123", "valid-state", session))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.GITHUB_AUTH_FAILED);
    }

    @Test
    void handleCallback_ShouldLinkFlow_ThrowException_WhenEmailsFetchFails() {
        when(session.getAttribute("github_oauth_state")).thenReturn("valid-state");
        when(session.getAttribute("github_linking_user_email")).thenReturn("user@example.com");

        com.godotlaunch.backend.dto.response.GitHubTokenResponse tokenRes = new com.godotlaunch.backend.dto.response.GitHubTokenResponse();
        tokenRes.setAccessToken("token");
        mockWebClientPost(tokenRes);

        com.godotlaunch.backend.dto.response.GitHubUserProfile profile = new com.godotlaunch.backend.dto.response.GitHubUserProfile();
        profile.setId("123456");
        mockWebClientGetProfile(profile);

        when(encryptionService.encrypt("token")).thenReturn("encToken");
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(mockUser));

        // Stub emails uri to throw exception when fetch emails is called
        when(requestHeadersUriSpec.uri("https://api.github.com/user/emails")).thenThrow(new RuntimeException("Emails API error"));

        assertThatThrownBy(() -> gitHubOAuthService.handleCallback("code123", "valid-state", session))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.GITHUB_EMAIL_REQUIRED);
    }

    @Test
    void handleCallback_ShouldLinkFlow_ThrowAccessDenied_WhenUserIsDeveloperOrAdmin() {
        when(session.getAttribute("github_oauth_state")).thenReturn("valid-state");
        when(session.getAttribute("github_linking_user_email")).thenReturn("user@example.com");

        com.godotlaunch.backend.dto.response.GitHubTokenResponse tokenRes = new com.godotlaunch.backend.dto.response.GitHubTokenResponse();
        tokenRes.setAccessToken("token");
        mockWebClientPost(tokenRes);

        com.godotlaunch.backend.dto.response.GitHubUserProfile profile = new com.godotlaunch.backend.dto.response.GitHubUserProfile();
        profile.setId("123456");
        mockWebClientGetProfile(profile);

        mockUser.setRole(developerRole); // developer cannot link

        when(encryptionService.encrypt("token")).thenReturn("encToken");
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(mockUser));

        assertThatThrownBy(() -> gitHubOAuthService.handleCallback("code123", "valid-state", session))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.ACCESS_DENIED);
    }

    @Test
    void handleCallback_ShouldLinkFlow_Success_WhenOldUserInactive() {
        when(session.getAttribute("github_oauth_state")).thenReturn("valid-state");
        when(session.getAttribute("github_linking_user_email")).thenReturn("user@example.com");

        com.godotlaunch.backend.dto.response.GitHubTokenResponse tokenRes = new com.godotlaunch.backend.dto.response.GitHubTokenResponse();
        tokenRes.setAccessToken("token");
        mockWebClientPost(tokenRes);

        com.godotlaunch.backend.dto.response.GitHubUserProfile profile = new com.godotlaunch.backend.dto.response.GitHubUserProfile();
        profile.setId("123456");
        profile.setLogin("testuser");
        mockWebClientGetProfile(profile);

        when(encryptionService.encrypt("token")).thenReturn("encToken");
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(mockUser));

        Map<String, Object> emailMap = new HashMap<>();
        emailMap.put("email", "user@example.com");
        emailMap.put("primary", true);
        emailMap.put("verified", true);
        mockWebClientGetEmails(Collections.singletonList(emailMap));

        User oldUser = new User();
        oldUser.setId(UUID.randomUUID());
        oldUser.setStatus("inactive"); // inactive old user
        oldUser.setGithubId("123456");
        when(userRepository.findByGithubId("123456")).thenReturn(Optional.of(oldUser));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtProvider.generateToken(any(), any(), any(), any())).thenReturn("linkedJwtToken");

        String jwt = gitHubOAuthService.handleCallback("code123", "valid-state", session);

        assertThat(jwt).isEqualTo("linkedJwtToken");
        verify(userRepository).saveAndFlush(oldUser);
        assertThat(oldUser.getGithubId()).isNull();
    }

    @Test
    void handleCallback_ShouldThrowException_WhenProfileEmailAndEmailsListEmpty() {
        when(session.getAttribute("github_oauth_state")).thenReturn("valid-state");
        com.godotlaunch.backend.dto.response.GitHubTokenResponse tokenRes = new com.godotlaunch.backend.dto.response.GitHubTokenResponse();
        tokenRes.setAccessToken("token");
        mockWebClientPost(tokenRes);

        com.godotlaunch.backend.dto.response.GitHubUserProfile profile = new com.godotlaunch.backend.dto.response.GitHubUserProfile();
        profile.setId("123456");
        profile.setEmail(null); // empty email
        mockWebClientGetProfile(profile);

        when(encryptionService.encrypt("token")).thenReturn("encToken");
        mockWebClientGetEmails(Collections.emptyList()); // empty email list

        assertThatThrownBy(() -> gitHubOAuthService.handleCallback("code123", "valid-state", session))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.GITHUB_EMAIL_REQUIRED);
    }
}
