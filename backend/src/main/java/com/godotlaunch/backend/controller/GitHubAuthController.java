package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.response.ApiResponse;
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
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth/github")
@RequiredArgsConstructor
@Tag(name = "GitHub OAuth API", description = "Endpoints for GitHub OAuth authentication flow")
public class GitHubAuthController {

    private final GitHubOAuthService githubOAuthService;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    @PostMapping("/prepare-link")
    @Operation(summary = "Prepare GitHub link session", description = "Saves user email to session and returns redirect URL. Role must be customer.")
    public ResponseEntity<ApiResponse<Map<String, String>>> prepareLink(Principal principal, HttpSession session) {
        if (principal == null) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        String email = principal.getName();
        String redirectUrl = githubOAuthService.prepareLinkSession(email, session);
        return ResponseEntity.ok(ApiResponse.success(Map.of("redirectUrl", redirectUrl), "Ready to link GitHub."));
    }

    @GetMapping
    @Operation(summary = "Redirect to GitHub OAuth page", description = "Redirects client browser to GitHub authentication page.")
    public ResponseEntity<Void> redirectToGitHub(
            @RequestParam(value = "action", required = false) String action,
            HttpSession session) {
        if ("link".equals(action)) {
            String linkingEmail = (String) session.getAttribute("github_linking_user_email");
            if (linkingEmail == null) {
                throw new AppException(ErrorCode.GITHUB_LINK_NOT_PREPARED);
            }
        }
        String authUrl = githubOAuthService.buildAuthorizationUrl(session);
        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(URI.create(authUrl));
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }

    @GetMapping("/callback")
    @Operation(summary = "GitHub OAuth callback", description = "Receives auth code, exchanges it for token, links/registers user, and redirects to frontend.")
    public ResponseEntity<Void> handleCallback(
            @RequestParam(value = "code", required = false) String code,
            @RequestParam(value = "error", required = false) String error,
            @RequestParam(value = "state", required = false) String state,
            HttpSession session) {

        boolean isLinkFlow = session.getAttribute("github_linking_user_email") != null;

        try {
            if (error != null || code == null) {
                throw new AppException(ErrorCode.GITHUB_AUTH_FAILED);
            }

            String jwt = githubOAuthService.handleCallback(code, state, session);

            HttpHeaders headers = new HttpHeaders();
            if (isLinkFlow) {
                headers.setLocation(URI.create(frontendUrl + "/auth/github/callback?token=" + jwt + "&linked=true"));
            } else {
                headers.setLocation(URI.create(frontendUrl + "/auth/callback?token=" + jwt));
            }
            return new ResponseEntity<>(headers, HttpStatus.FOUND);

        } catch (AppException e) {
            HttpHeaders headers = new HttpHeaders();
            headers.setLocation(URI.create(frontendUrl + "/auth/github/callback?error=" + e.getErrorCode().getCode()));
            return new ResponseEntity<>(headers, HttpStatus.FOUND);
        } catch (Exception e) {
            HttpHeaders headers = new HttpHeaders();
            headers.setLocation(URI.create(frontendUrl + "/auth/github/callback?error=unknown"));
            return new ResponseEntity<>(headers, HttpStatus.FOUND);
        }
    }
}
