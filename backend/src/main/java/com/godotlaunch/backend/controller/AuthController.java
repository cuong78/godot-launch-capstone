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
import com.godotlaunch.backend.security.JwtProvider;
import com.godotlaunch.backend.service.AuthService;
import com.godotlaunch.backend.service.SeaweedFsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
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
    private final SeaweedFsService seaweedFsService;
    private final JwtProvider jwtProvider;

    private static final String COOKIE_NAME = "app_token";
    private static final int COOKIE_MAX_AGE = 86400; // 24h (seconds)
    private static final int REMEMBER_ME_COOKIE_MAX_AGE = 30 * 86400; // 30 days (seconds)

    @PostMapping(value = "/avatar", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload user avatar")
    public ResponseEntity<ApiResponse<String>> uploadAvatar(@RequestParam("file") MultipartFile file) {
        String avatarUrl = seaweedFsService.uploadFile(file, "avatars");
        return ResponseEntity.ok(ApiResponse.success(avatarUrl, "Avatar uploaded successfully."));
    }

    @PostMapping("/signup")
    @Operation(summary = "Register a new user")
    public ResponseEntity<ApiResponse<UserResponse>> signUp(@Valid @RequestBody SignUpRequest request) {
        return ResponseEntity.ok(ApiResponse.success(authService.signUp(request), "User registered successfully."));
    }

    @PostMapping("/signin")
    @Operation(summary = "Authenticate user and get JWT + httpOnly cookie")
    public ResponseEntity<ApiResponse<JwtAuthenticationResponse>> signIn(
            @Valid @RequestBody SignInRequest request,
            HttpServletResponse response) {
        JwtAuthenticationResponse authResponse = authService.signIn(request);
        boolean rememberMe = request.getRememberMe() != null && request.getRememberMe();
        setAuthCookie(response, authResponse.getToken(), rememberMe);
        return ResponseEntity.ok(ApiResponse.success(authResponse, "Login successful."));
    }

    @PostMapping("/google")
    @Operation(summary = "Authenticate with Google")
    public ResponseEntity<ApiResponse<JwtAuthenticationResponse>> loginWithGoogle(
            @Valid @RequestBody GoogleLoginRequest request,
            HttpServletResponse response) {
        JwtAuthenticationResponse authResponse = authService.loginWithGoogle(request);
        boolean rememberMe = request.getRememberMe() != null && request.getRememberMe();
        setAuthCookie(response, authResponse.getToken(), rememberMe);
        return ResponseEntity.ok(ApiResponse.success(authResponse, "Google login successful."));
    }

    @PostMapping("/github")
    @Operation(summary = "Authenticate with GitHub")
    public ResponseEntity<ApiResponse<JwtAuthenticationResponse>> loginWithGitHub(
            @Valid @RequestBody GitHubLoginRequest request,
            HttpServletResponse response) {
        JwtAuthenticationResponse authResponse = authService.loginWithGitHub(request);
        boolean rememberMe = request.getRememberMe() != null && request.getRememberMe();
        setAuthCookie(response, authResponse.getToken(), rememberMe);
        return ResponseEntity.ok(ApiResponse.success(authResponse, "GitHub login successful."));
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout — revoke session + clear cookie")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletRequest request, HttpServletResponse response) {
        // Lấy email từ JWT hiện tại (Bearer hoặc cookie)
        String token = resolveToken(request);
        if (token != null && jwtProvider.validateToken(token)) {
            String email = jwtProvider.getUsernameFromToken(token);
            authService.logout(email);
        }
        clearAuthCookie(response);
        return ResponseEntity.ok(ApiResponse.success(null, "Logged out successfully."));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Request password reset OTP")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.requestPasswordReset(request);
        return ResponseEntity.ok(ApiResponse.success(null, "OTP verification code sent to your email."));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset password with OTP")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success(null, "Password reset successfully."));
    }

    @PostMapping("/signup/otp")
    @Operation(summary = "Send OTP for signup verification")
    public ResponseEntity<ApiResponse<Void>> requestSignupOtp(@Valid @RequestBody SignupOtpRequest request) {
        authService.requestSignupOtp(request);
        return ResponseEntity.ok(ApiResponse.success(null, "OTP verification code sent to your email."));
    }

    @PostMapping("/signup/otp/verify")
    @Operation(summary = "Verify OTP for signup")
    public ResponseEntity<ApiResponse<Void>> verifySignupOtp(@Valid @RequestBody VerifyOtpRequest request) {
        authService.verifySignupOtp(request);
        return ResponseEntity.ok(ApiResponse.success(null, "OTP verified successfully."));
    }

    // ── Cookie helpers ────────────────────────────────────────

    /**
     * Set httpOnly cookie "app_token" — JavaScript không đọc được,
     * browser tự gửi kèm mọi request đến cùng domain.
     */
    private void setAuthCookie(HttpServletResponse response, String token) {
        setAuthCookie(response, token, false);
    }

    private void setAuthCookie(HttpServletResponse response, String token, boolean rememberMe) {
        Cookie cookie = new Cookie(COOKIE_NAME, token);
        cookie.setHttpOnly(true);   // JS không đọc được → chống XSS
        cookie.setSecure(false);    // true khi deploy HTTPS production
        cookie.setPath("/");
        cookie.setMaxAge(rememberMe ? REMEMBER_ME_COOKIE_MAX_AGE : COOKIE_MAX_AGE);
        response.addCookie(cookie);
    }

    private void clearAuthCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie(COOKIE_NAME, "");
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(0); // xóa cookie ngay
        response.addCookie(cookie);
    }

    private String resolveToken(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (bearer != null && bearer.startsWith("Bearer ")) return bearer.substring(7);
        if (request.getCookies() != null) {
            for (Cookie c : request.getCookies()) {
                if (COOKIE_NAME.equals(c.getName())) return c.getValue();
            }
        }
        return null;
    }
}
