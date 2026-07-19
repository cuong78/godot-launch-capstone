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
import org.springframework.web.reactive.function.client.WebClient;

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
}
