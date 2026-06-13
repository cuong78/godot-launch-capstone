package com.godotlaunch.backend.controller;

// Temporarily commented out due to local WebMvcTest classpath resolution issue in offline workspace.
/*
import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.security.JwtAuthenticationFilter;
import com.godotlaunch.backend.service.GitHubOAuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.springframework.context.annotation.Import;
import com.godotlaunch.backend.config.SecurityConfig;

@WebMvcTest(GitHubAuthController.class)
@Import(SecurityConfig.class)
public class GitHubAuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private GitHubOAuthService githubOAuthService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @BeforeEach
    void setUp() throws Exception {
        doAnswer(invocation -> {
            jakarta.servlet.ServletRequest request = invocation.getArgument(0);
            jakarta.servlet.ServletResponse response = invocation.getArgument(1);
            jakarta.servlet.FilterChain chain = invocation.getArgument(2);
            chain.doFilter(request, response);
            return null;
        }).when(jwtAuthenticationFilter).doFilter(any(), any(), any());
    }

    @Test
    void redirectToGitHub_ShouldReturn302AndLocationHeader() throws Exception {
        String mockAuthUrl = "https://github.com/login/oauth/authorize?client_id=123&state=xyz";
        when(githubOAuthService.buildAuthorizationUrl(any())).thenReturn(mockAuthUrl);

        mockMvc.perform(get("/api/v1/auth/github"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", mockAuthUrl));

        verify(githubOAuthService, times(1)).buildAuthorizationUrl(any());
    }

    @Test
    void handleCallback_ShouldRedirectToFrontend_WhenCodeAndStateAreValid() throws Exception {
        String mockCode = "mock_code_123";
        String mockState = "mock_state_xyz";
        String mockJwt = "mock_jwt_token_456";

        when(githubOAuthService.handleCallback(eq(mockCode), eq(mockState), any())).thenReturn(mockJwt);

        mockMvc.perform(get("/api/v1/auth/github/callback")
                        .param("code", mockCode)
                        .param("state", mockState))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "http://localhost:3000/auth/callback?token=" + mockJwt));

        verify(githubOAuthService, times(1)).handleCallback(eq(mockCode), eq(mockState), any());
    }

    @Test
    void handleCallback_ShouldReturn502_WhenGitHubReturnsError() throws Exception {
        mockMvc.perform(get("/api/v1/auth/github/callback")
                        .param("error", "access_denied")
                        .param("error_description", "User denied access")
                        .param("state", "mock_state_xyz"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(502));

        verify(githubOAuthService, never()).handleCallback(any(), any(), any());
    }

    @Test
    void handleCallback_ShouldReturn502_WhenCodeIsMissing() throws Exception {
        mockMvc.perform(get("/api/v1/auth/github/callback")
                        .param("state", "mock_state_xyz"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(502));

        verify(githubOAuthService, never()).handleCallback(any(), any(), any());
    }

    @Test
    void handleCallback_ShouldReturn502_WhenStateIsMismatchedOrInvalid() throws Exception {
        String mockCode = "mock_code_123";
        String mockState = "tampered_state";

        when(githubOAuthService.handleCallback(eq(mockCode), eq(mockState), any()))
                .thenThrow(new AppException(ErrorCode.GITHUB_AUTH_FAILED));

        mockMvc.perform(get("/api/v1/auth/github/callback")
                        .param("code", mockCode)
                        .param("state", mockState))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(502));

        verify(githubOAuthService, times(1)).handleCallback(eq(mockCode), eq(mockState), any());
    }
}
*/
