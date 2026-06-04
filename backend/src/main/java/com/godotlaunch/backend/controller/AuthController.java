package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.GitHubLoginRequest;
import com.godotlaunch.backend.dto.request.GoogleLoginRequest;
import com.godotlaunch.backend.dto.request.SignInRequest;
import com.godotlaunch.backend.dto.request.SignUpRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.JwtAuthenticationResponse;
import com.godotlaunch.backend.dto.response.UserResponse;
import com.godotlaunch.backend.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication API", description = "Endpoints for registering and authenticating platform users")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    @Operation(summary = "Register a new user", description = "Creates a new user profile with selected roles (player/developer). Defaults to 'player'.")
    public ResponseEntity<ApiResponse<UserResponse>> signUp(@Valid @RequestBody SignUpRequest request) {
        UserResponse response = authService.signUp(request);
        return ResponseEntity.ok(ApiResponse.success(response, "User registered successfully."));
    }

    @PostMapping("/signin")
    @Operation(summary = "Authenticate user and get JWT", description = "Verifies email and password, returning user profile details and standard JWT token.")
    public ResponseEntity<ApiResponse<JwtAuthenticationResponse>> signIn(@Valid @RequestBody SignInRequest request) {
        JwtAuthenticationResponse response = authService.signIn(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Login successful."));
    }

    @PostMapping("/google")
    @Operation(summary = "Authenticate with Google", description = "Validates Google ID token and returns standard JWT token.")
    public ResponseEntity<ApiResponse<JwtAuthenticationResponse>> loginWithGoogle(@Valid @RequestBody GoogleLoginRequest request) {
        JwtAuthenticationResponse response = authService.loginWithGoogle(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Google login successful."));
    }

    @PostMapping("/github")
    @Operation(summary = "Authenticate with GitHub", description = "Exchanges GitHub auth code and returns standard JWT token.")
    public ResponseEntity<ApiResponse<JwtAuthenticationResponse>> loginWithGitHub(@Valid @RequestBody GitHubLoginRequest request) {
        JwtAuthenticationResponse response = authService.loginWithGitHub(request);
        return ResponseEntity.ok(ApiResponse.success(response, "GitHub login successful."));
    }
}
