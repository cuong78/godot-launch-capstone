package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.*;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.JwtAuthenticationResponse;
import com.godotlaunch.backend.dto.response.UserResponse;
import com.godotlaunch.backend.security.JwtProvider;
import com.godotlaunch.backend.service.AuthService;
import com.godotlaunch.backend.service.SeaweedFsService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
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
import org.springframework.mock.web.MockMultipartFile;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    @Mock
    private SeaweedFsService seaweedFsService;

    @Mock
    private JwtProvider jwtProvider;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @InjectMocks
    private AuthController authController;

    private UserResponse mockUserResponse;
    private JwtAuthenticationResponse mockJwtResponse;

    @BeforeEach
    void setUp() {
        mockUserResponse = UserResponse.builder()
                .id(UUID.randomUUID())
                .email("user@example.com")
                .fullName("Test User")
                .roleName("customer")
                .status("active")
                .build();

        mockJwtResponse = JwtAuthenticationResponse.builder()
                .token("jwt.token.val")
                .user(mockUserResponse)
                .build();
    }

    @Test
    @DisplayName("Should upload avatar successfully")
    void shouldUploadAvatar_Successfully() {
        // Arrange
        MockMultipartFile file = new MockMultipartFile("file", "avatar.png", "image/png", "bytes".getBytes());
        when(seaweedFsService.uploadFile(file, "avatars")).thenReturn("http://seaweedfs/avatars/avatar.png");

        // Act
        ResponseEntity<ApiResponse<String>> result = authController.uploadAvatar(file);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody()).isNotNull();
        assertThat(result.getBody().getData()).isEqualTo("http://seaweedfs/avatars/avatar.png");
        verify(seaweedFsService, times(1)).uploadFile(file, "avatars");
    }

    @Test
    @DisplayName("Should sign up user successfully")
    void shouldSignUp_Successfully() {
        // Arrange
        SignUpRequest signUpRequest = new SignUpRequest();
        signUpRequest.setEmail("user@example.com");
        signUpRequest.setPassword("password123");
        signUpRequest.setConfirmPassword("password123");
        signUpRequest.setFullName("Test User");

        when(authService.signUp(any(SignUpRequest.class))).thenReturn(mockUserResponse);

        // Act
        ResponseEntity<ApiResponse<UserResponse>> result = authController.signUp(signUpRequest);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody()).isNotNull();
        assertThat(result.getBody().getData().getEmail()).isEqualTo("user@example.com");
        verify(authService, times(1)).signUp(signUpRequest);
    }

    @Test
    @DisplayName("Should sign in user and set auth cookie")
    void shouldSignIn_AndSetAuthCookie() {
        // Arrange
        SignInRequest signInRequest = new SignInRequest();
        signInRequest.setEmail("user@example.com");
        signInRequest.setPassword("password123");
        signInRequest.setRememberMe(true);

        when(authService.signIn(any(SignInRequest.class))).thenReturn(mockJwtResponse);

        // Act
        ResponseEntity<ApiResponse<JwtAuthenticationResponse>> result = authController.signIn(signInRequest, response);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody()).isNotNull();
        assertThat(result.getBody().getData().getToken()).isEqualTo("jwt.token.val");

        ArgumentCaptor<Cookie> cookieCaptor = ArgumentCaptor.forClass(Cookie.class);
        verify(response, times(1)).addCookie(cookieCaptor.capture());
        Cookie setCookie = cookieCaptor.getValue();
        assertThat(setCookie.getName()).isEqualTo("app_token");
        assertThat(setCookie.getValue()).isEqualTo("jwt.token.val");
        assertThat(setCookie.isHttpOnly()).isTrue();
        assertThat(setCookie.getMaxAge()).isEqualTo(30 * 86400);
    }

    @Test
    @DisplayName("Should login with Google successfully")
    void shouldLoginWithGoogle_Successfully() {
        // Arrange
        GoogleLoginRequest googleRequest = new GoogleLoginRequest();
        googleRequest.setIdToken("google-id-token");
        googleRequest.setRememberMe(false);

        when(authService.loginWithGoogle(any(GoogleLoginRequest.class))).thenReturn(mockJwtResponse);

        // Act
        ResponseEntity<ApiResponse<JwtAuthenticationResponse>> result = authController.loginWithGoogle(googleRequest, response);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(authService, times(1)).loginWithGoogle(googleRequest);
        verify(response, times(1)).addCookie(any(Cookie.class));
    }

    @Test
    @DisplayName("Should login with GitHub successfully")
    void shouldLoginWithGitHub_Successfully() {
        // Arrange
        GitHubLoginRequest gitHubRequest = new GitHubLoginRequest();
        gitHubRequest.setCode("github-code");

        when(authService.loginWithGitHub(any(GitHubLoginRequest.class))).thenReturn(mockJwtResponse);

        // Act
        ResponseEntity<ApiResponse<JwtAuthenticationResponse>> result = authController.loginWithGitHub(gitHubRequest, response);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(authService, times(1)).loginWithGitHub(gitHubRequest);
        verify(response, times(1)).addCookie(any(Cookie.class));
    }

    @Test
    @DisplayName("Should logout user and clear auth cookie")
    void shouldLogout_AndClearAuthCookie() {
        // Arrange
        String token = "valid-token";
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtProvider.validateToken(token)).thenReturn(true);
        when(jwtProvider.getUsernameFromToken(token)).thenReturn("user@example.com");

        // Act
        ResponseEntity<ApiResponse<Void>> result = authController.logout(request, response);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(authService, times(1)).logout("user@example.com");

        ArgumentCaptor<Cookie> cookieCaptor = ArgumentCaptor.forClass(Cookie.class);
        verify(response, times(1)).addCookie(cookieCaptor.capture());
        Cookie clearedCookie = cookieCaptor.getValue();
        assertThat(clearedCookie.getName()).isEqualTo("app_token");
        assertThat(clearedCookie.getMaxAge()).isEqualTo(0);
    }

    @Test
    @DisplayName("Should request forgot password OTP successfully")
    void shouldForgotPassword_Successfully() {
        // Arrange
        ForgotPasswordRequest forgotRequest = new ForgotPasswordRequest();
        forgotRequest.setEmail("user@example.com");

        doNothing().when(authService).requestPasswordReset(forgotRequest);

        // Act
        ResponseEntity<ApiResponse<Void>> result = authController.forgotPassword(forgotRequest);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(authService, times(1)).requestPasswordReset(forgotRequest);
    }

    @Test
    @DisplayName("Should reset password with OTP successfully")
    void shouldResetPassword_Successfully() {
        // Arrange
        ResetPasswordRequest resetRequest = new ResetPasswordRequest();
        resetRequest.setEmail("user@example.com");
        resetRequest.setOtp("123456");
        resetRequest.setNewPassword("newpass123");
        resetRequest.setConfirmPassword("newpass123");

        doNothing().when(authService).resetPassword(resetRequest);

        // Act
        ResponseEntity<ApiResponse<Void>> result = authController.resetPassword(resetRequest);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(authService, times(1)).resetPassword(resetRequest);
    }

    @Test
    @DisplayName("Should request signup OTP successfully")
    void shouldRequestSignupOtp_Successfully() {
        // Arrange
        SignupOtpRequest signupOtpRequest = new SignupOtpRequest();
        signupOtpRequest.setEmail("newuser@example.com");

        doNothing().when(authService).requestSignupOtp(signupOtpRequest);

        // Act
        ResponseEntity<ApiResponse<Void>> result = authController.requestSignupOtp(signupOtpRequest);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(authService, times(1)).requestSignupOtp(signupOtpRequest);
    }

    @Test
    @DisplayName("Should verify signup OTP successfully")
    void shouldVerifySignupOtp_Successfully() {
        // Arrange
        VerifyOtpRequest verifyOtpRequest = new VerifyOtpRequest();
        verifyOtpRequest.setEmail("newuser@example.com");
        verifyOtpRequest.setOtp("123456");

        doNothing().when(authService).verifySignupOtp(verifyOtpRequest);

        // Act
        ResponseEntity<ApiResponse<Void>> result = authController.verifySignupOtp(verifyOtpRequest);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(authService, times(1)).verifySignupOtp(verifyOtpRequest);
    }
}
