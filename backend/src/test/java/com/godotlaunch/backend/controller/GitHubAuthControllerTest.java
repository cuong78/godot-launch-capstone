package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.service.GitHubOAuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.security.Principal;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GitHubAuthControllerTest {

    @Mock
    private GitHubOAuthService githubOAuthService;

    @Mock
    private HttpSession session;

    @Mock
    private HttpServletResponse response;

    @Mock
    private Principal principal;

    @InjectMocks
    private GitHubAuthController gitHubAuthController;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(gitHubAuthController, "frontendUrl", "http://localhost:3000");
    }

    @Test
    @DisplayName("Should prepare link session successfully when authenticated principal provided")
    void shouldPrepareLink_Successfully() {
        // Arrange
        when(principal.getName()).thenReturn("user@example.com");
        when(githubOAuthService.prepareLinkSession("user@example.com", session))
                .thenReturn("http://localhost:8080/api/v1/auth/github?action=link");

        // Act
        ResponseEntity<ApiResponse<Map<String, String>>> result = gitHubAuthController.prepareLink(principal, session);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody()).isNotNull();
        assertThat(result.getBody().getData().get("redirectUrl"))
                .isEqualTo("http://localhost:8080/api/v1/auth/github?action=link");
    }

    @Test
    @DisplayName("Should throw UNAUTHORIZED when principal is null on prepareLink")
    void shouldThrowUnauthorized_WhenPrincipalIsNullOnPrepareLink() {
        // Act & Assert
        assertThatThrownBy(() -> gitHubAuthController.prepareLink(null, session))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.UNAUTHORIZED);
    }

    @Test
    @DisplayName("Should redirect to GitHub OAuth page with 302 FOUND")
    void shouldRedirectToGitHub_Successfully() {
        // Arrange
        when(githubOAuthService.buildAuthorizationUrl(session))
                .thenReturn("https://github.com/login/oauth/authorize?client_id=123");

        // Act
        ResponseEntity<Void> result = gitHubAuthController.redirectToGitHub(null, true, session);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.FOUND);
        assertThat(result.getHeaders().getLocation()).isNotNull();
        assertThat(result.getHeaders().getLocation().toString())
                .isEqualTo("https://github.com/login/oauth/authorize?client_id=123");
        verify(session, times(1)).setAttribute("github_oauth_remember_me", true);
    }

    @Test
    @DisplayName("Should throw GITHUB_LINK_NOT_PREPARED when action=link but session has no linking user email")
    void shouldThrowException_WhenLinkActionNotPrepared() {
        // Arrange
        when(session.getAttribute("github_linking_user_email")).thenReturn(null);

        // Act & Assert
        assertThatThrownBy(() -> gitHubAuthController.redirectToGitHub("link", false, session))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.GITHUB_LINK_NOT_PREPARED);
    }

    @Test
    @DisplayName("Should handle callback successfully for standard login flow")
    void shouldHandleCallback_Successfully_StandardLogin() {
        // Arrange
        when(session.getAttribute("github_linking_user_email")).thenReturn(null);
        when(session.getAttribute("github_oauth_remember_me")).thenReturn(false);
        when(githubOAuthService.handleCallback(eq("code123"), eq("state456"), eq(session)))
                .thenReturn("jwt.auth.token");

        // Act
        ResponseEntity<Void> result = gitHubAuthController.handleCallback("code123", null, "state456", session, response);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.FOUND);
        assertThat(result.getHeaders().getLocation().toString())
                .isEqualTo("http://localhost:3000/auth/callback?token=jwt.auth.token");

        ArgumentCaptor<Cookie> cookieCaptor = ArgumentCaptor.forClass(Cookie.class);
        verify(response, times(1)).addCookie(cookieCaptor.capture());
        assertThat(cookieCaptor.getValue().getName()).isEqualTo("app_token");
        assertThat(cookieCaptor.getValue().getValue()).isEqualTo("jwt.auth.token");
    }

    @Test
    @DisplayName("Should handle callback successfully for link flow")
    void shouldHandleCallback_Successfully_LinkFlow() {
        // Arrange
        when(session.getAttribute("github_linking_user_email")).thenReturn("user@example.com");
        when(session.getAttribute("github_oauth_remember_me")).thenReturn(true);
        when(githubOAuthService.handleCallback(eq("code123"), eq("state456"), eq(session)))
                .thenReturn("jwt.auth.token");

        // Act
        ResponseEntity<Void> result = gitHubAuthController.handleCallback("code123", null, "state456", session, response);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.FOUND);
        assertThat(result.getHeaders().getLocation().toString())
                .isEqualTo("http://localhost:3000/auth/github/callback?token=jwt.auth.token&linked=true");
    }

    @Test
    @DisplayName("Should redirect with error code param when AppException occurs during callback")
    void shouldRedirectWithError_WhenAppExceptionOccursOnCallback() {
        // Arrange
        when(githubOAuthService.handleCallback(eq("code123"), eq("state456"), eq(session)))
                .thenThrow(new AppException(ErrorCode.GITHUB_EMAIL_MISMATCH));

        // Act
        ResponseEntity<Void> result = gitHubAuthController.handleCallback("code123", null, "state456", session, response);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.FOUND);
        assertThat(result.getHeaders().getLocation().toString())
                .contains("/auth/github/callback?error=" + ErrorCode.GITHUB_EMAIL_MISMATCH.getCode());
    }
}
