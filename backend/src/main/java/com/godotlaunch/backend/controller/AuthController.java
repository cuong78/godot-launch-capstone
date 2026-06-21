package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.GitHubLoginRequest;
import com.godotlaunch.backend.dto.request.GoogleLoginRequest;
import com.godotlaunch.backend.dto.request.SignInRequest;
import com.godotlaunch.backend.dto.request.SignUpRequest;
import com.godotlaunch.backend.dto.request.ForgotPasswordRequest;
import com.godotlaunch.backend.dto.request.ResetPasswordRequest;
import com.godotlaunch.backend.dto.request.SignupOtpRequest;
import com.godotlaunch.backend.dto.request.VerifyOtpRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.JwtAuthenticationResponse;
import com.godotlaunch.backend.dto.response.UserResponse;
import com.godotlaunch.backend.entity.enums.FileType;
import com.godotlaunch.backend.service.AuthService;
import com.godotlaunch.backend.service.impl.StorageRouter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication API", description = "Endpoints for registering and authenticating platform users")
public class AuthController {

    private final AuthService authService;
    private final StorageRouter storageRouter;

    @PostMapping(value = "/avatar", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload user avatar to S3", description = "Uploads a multipart file to S3 and returns the public url. Publicly accessible for profile creation during registration.")
    public ResponseEntity<ApiResponse<String>> uploadAvatar(@RequestParam("file") MultipartFile file) {
        String avatarUrl = storageRouter.upload(FileType.avatar, file, "avatars");
        return ResponseEntity.ok(ApiResponse.success(avatarUrl, "Avatar uploaded successfully."));
    }

    @PostMapping("/signup")
    @Operation(summary = "Register a new user", description = "Creates a new user profile with selected roles (customer/developer). Defaults to 'customer'.")
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

    @PostMapping("/forgot-password")
    @Operation(summary = "Request password reset OTP", description = "Checks email registration and sends a 6-digit OTP code to the user's email.")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.requestPasswordReset(request);
        return ResponseEntity.ok(ApiResponse.success(null, "OTP verification code sent to your email."));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset password with OTP", description = "Validates the OTP code and updates the user's password.")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success(null, "Password reset successfully. You can now log in with your new password."));
    }

    @PostMapping("/signup/otp")
    @Operation(summary = "Send OTP for signup verification", description = "Generates a 6-digit OTP and sends it to the user's email if the email is not already registered.")
    public ResponseEntity<ApiResponse<Void>> requestSignupOtp(@Valid @RequestBody SignupOtpRequest request) {
        authService.requestSignupOtp(request);
        return ResponseEntity.ok(ApiResponse.success(null, "OTP verification code sent to your email."));
    }

    @PostMapping("/signup/otp/verify")
    @Operation(summary = "Verify OTP for signup", description = "Validates the OTP code for the given email to allow proceeding with registration.")
    public ResponseEntity<ApiResponse<Void>> verifySignupOtp(@Valid @RequestBody VerifyOtpRequest request) {
        authService.verifySignupOtp(request);
        return ResponseEntity.ok(ApiResponse.success(null, "OTP verified successfully."));
    }
}
