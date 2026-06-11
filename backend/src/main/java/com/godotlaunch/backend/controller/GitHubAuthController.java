package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.service.GitHubOAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

@RestController
@RequestMapping("/api/v1/auth/github")
@RequiredArgsConstructor
@Tag(name = "GitHub OAuth API", description = "Endpoints for GitHub OAuth authentication flow")
public class GitHubAuthController {

    private final GitHubOAuthService githubOAuthService;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    @GetMapping
    @Operation(summary = "Redirect to GitHub OAuth page", description = "Redirects client browser to GitHub authentication page.")
    public ResponseEntity<Void> redirectToGitHub(HttpSession session) {
        String authUrl = githubOAuthService.buildAuthorizationUrl(session);
        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(URI.create(authUrl));
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }

    @GetMapping("/callback")
    @Operation(summary = "GitHub OAuth callback", description = "Receives auth code, exchanges it for token, links/registers user, and redirects to frontend with JWT.")
    public ResponseEntity<Void> handleCallback(
            @RequestParam(value = "code", required = false) String code,
            @RequestParam(value = "error", required = false) String error,
            @RequestParam(value = "state", required = false) String state,
            HttpSession session) {

        if (error != null || code == null) {
            throw new AppException(ErrorCode.GITHUB_AUTH_FAILED);
        }

        String jwt = githubOAuthService.handleCallback(code, state, session);

        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(URI.create(frontendUrl + "/auth/callback?token=" + jwt));
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }
}
