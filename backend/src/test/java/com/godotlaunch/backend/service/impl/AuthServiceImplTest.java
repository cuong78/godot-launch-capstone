package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.*;
import com.godotlaunch.backend.dto.response.JwtAuthenticationResponse;
import com.godotlaunch.backend.dto.response.UserResponse;
import com.godotlaunch.backend.entity.Role;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.RoleRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.security.EncryptionUtils;
import com.godotlaunch.backend.security.JwtProvider;
import com.godotlaunch.backend.service.AuditLogService;
import com.godotlaunch.backend.service.EmailService;
import com.godotlaunch.backend.service.OtpService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtProvider jwtProvider;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private EncryptionUtils encryptionUtils;

    @Mock
    private OtpService otpService;

    @Mock
    private EmailService emailService;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private HttpServletRequest httpServletRequest;

    @InjectMocks
    private AuthServiceImpl authService;

    private User mockUser;
    private Role customerRole;

    @BeforeEach
    void setUp() {
        customerRole = new Role();
        customerRole.setId(UUID.randomUUID());
        customerRole.setName("customer");

        mockUser = new User();
        mockUser.setId(UUID.randomUUID());
        mockUser.setEmail("user@example.com");
        mockUser.setFullName("Test User");
        mockUser.setPasswordHash("hashed_password");
        mockUser.setStatus("active");
        mockUser.setRole(customerRole);
    }

    @Test
    @DisplayName("Should sign up user successfully when valid request provided")
    void shouldSignUp_Successfully_WhenValidRequest() {
        // Arrange
        SignUpRequest request = new SignUpRequest();
        request.setEmail("user@example.com");
        request.setPassword("password123");
        request.setConfirmPassword("password123");
        request.setFullName("Test User");
        request.setOtp("123456");
        request.setRecaptchaToken("local-dev-bypass");

        when(httpServletRequest.getServerName()).thenReturn("localhost");
        when(otpService.validateOtp("user@example.com", "123456")).thenReturn(true);
        when(userRepository.existsByEmail("user@example.com")).thenReturn(false);
        when(roleRepository.findByName("customer")).thenReturn(Optional.of(customerRole));
        when(passwordEncoder.encode("password123")).thenReturn("hashed_password");
        when(userRepository.save(any(User.class))).thenReturn(mockUser);

        // Act
        UserResponse response = authService.signUp(request);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getEmail()).isEqualTo("user@example.com");
        verify(otpService, times(1)).invalidateOtp("user@example.com");
        verify(auditLogService, times(1)).publish(any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Should throw INVALID_OTP when OTP validation fails during signup")
    void shouldThrowException_WhenSignupOtpInvalid() {
        // Arrange
        SignUpRequest request = new SignUpRequest();
        request.setEmail("user@example.com");
        request.setPassword("password123");
        request.setConfirmPassword("password123");
        request.setOtp("000000");
        request.setRecaptchaToken("local-dev-bypass");

        when(httpServletRequest.getServerName()).thenReturn("localhost");
        when(otpService.validateOtp("user@example.com", "000000")).thenReturn(false);

        // Act & Assert
        assertThatThrownBy(() -> authService.signUp(request))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_OTP);
    }

    @Test
    @DisplayName("Should throw PASSWORDS_DO_NOT_MATCH when passwords mismatch during signup")
    void shouldThrowException_WhenPasswordsMismatch() {
        // Arrange
        SignUpRequest request = new SignUpRequest();
        request.setEmail("user@example.com");
        request.setPassword("password123");
        request.setConfirmPassword("different123");
        request.setOtp("123456");
        request.setRecaptchaToken("local-dev-bypass");

        when(httpServletRequest.getServerName()).thenReturn("localhost");
        when(otpService.validateOtp("user@example.com", "123456")).thenReturn(true);

        // Act & Assert
        assertThatThrownBy(() -> authService.signUp(request))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.PASSWORDS_DO_NOT_MATCH);
    }

    @Test
    @DisplayName("Should throw DUPLICATE_EMAIL when email already exists during signup")
    void shouldThrowException_WhenEmailDuplicateOnSignup() {
        // Arrange
        SignUpRequest request = new SignUpRequest();
        request.setEmail("user@example.com");
        request.setPassword("password123");
        request.setConfirmPassword("password123");
        request.setOtp("123456");
        request.setRecaptchaToken("local-dev-bypass");

        when(httpServletRequest.getServerName()).thenReturn("localhost");
        when(otpService.validateOtp("user@example.com", "123456")).thenReturn(true);
        when(userRepository.existsByEmail("user@example.com")).thenReturn(true);

        // Act & Assert
        assertThatThrownBy(() -> authService.signUp(request))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.DUPLICATE_EMAIL);
    }

    @Test
    @DisplayName("Should sign in user successfully and return JWT response")
    void shouldSignIn_Successfully() {
        // Arrange
        SignInRequest request = new SignInRequest();
        request.setEmail("user@example.com");
        request.setPassword("password123");
        request.setRememberMe(false);

        Authentication auth = mock(Authentication.class);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(auth);
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(mockUser));
        when(userRepository.save(any(User.class))).thenReturn(mockUser);
        when(jwtProvider.generateToken(eq("user@example.com"), any(), eq("customer"), any(), eq(false))).thenReturn("jwt-token-xyz");

        // Act
        JwtAuthenticationResponse response = authService.signIn(request);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getToken()).isEqualTo("jwt-token-xyz");
        assertThat(response.getUser().getEmail()).isEqualTo("user@example.com");
        verify(auditLogService, times(1)).publish(any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Should publish failed audit log and throw BadCredentialsException on authentication failure")
    void shouldThrowException_WhenAuthenticationFails() {
        // Arrange
        SignInRequest request = new SignInRequest();
        request.setEmail("user@example.com");
        request.setPassword("wrongpassword");

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(mockUser));

        // Act & Assert
        assertThatThrownBy(() -> authService.signIn(request))
                .isInstanceOf(BadCredentialsException.class);

        verify(auditLogService, times(1)).publish(any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Should throw USER_BANNED when banned user attempts login")
    void shouldThrowException_WhenUserIsBannedOnSignIn() {
        // Arrange
        SignInRequest request = new SignInRequest();
        request.setEmail("user@example.com");
        request.setPassword("password123");

        mockUser.setStatus("banned");
        Authentication auth = mock(Authentication.class);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(auth);
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(mockUser));

        // Act & Assert
        assertThatThrownBy(() -> authService.signIn(request))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.USER_BANNED);
    }

    @Test
    @DisplayName("Should request password reset successfully")
    void shouldRequestPasswordReset_Successfully() {
        // Arrange
        ForgotPasswordRequest request = new ForgotPasswordRequest();
        request.setEmail("user@example.com");

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(mockUser));
        when(otpService.generateOtp("user@example.com")).thenReturn("654321");

        // Act
        authService.requestPasswordReset(request);

        // Assert
        verify(emailService, times(1)).sendOtpEmail("user@example.com", "654321");
    }

    @Test
    @DisplayName("Should reset password with valid OTP")
    void shouldResetPassword_Successfully() {
        // Arrange
        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setEmail("user@example.com");
        request.setOtp("654321");
        request.setNewPassword("newpassword123");
        request.setConfirmPassword("newpassword123");

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(mockUser));
        when(otpService.validateOtp("user@example.com", "654321")).thenReturn(true);
        when(passwordEncoder.encode("newpassword123")).thenReturn("new_hashed_password");

        // Act
        authService.resetPassword(request);

        // Assert
        assertThat(mockUser.getPasswordHash()).isEqualTo("new_hashed_password");
        verify(userRepository, times(1)).save(mockUser);
        verify(otpService, times(1)).invalidateOtp("user@example.com");
    }

    @Test
    @DisplayName("Should request signup OTP successfully")
    void shouldRequestSignupOtp_Successfully() {
        // Arrange
        SignupOtpRequest request = new SignupOtpRequest();
        request.setEmail("newuser@example.com");

        when(userRepository.existsByEmail("newuser@example.com")).thenReturn(false);
        when(otpService.generateOtp("newuser@example.com")).thenReturn("112233");

        // Act
        authService.requestSignupOtp(request);

        // Assert
        verify(emailService, times(1)).sendSignupOtpEmail("newuser@example.com", "112233");
    }

    @Test
    @DisplayName("Should logout user and clear sessionHash")
    void shouldLogout_Successfully() {
        // Arrange
        mockUser.setSessionHash("active_hash");
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(mockUser));

        // Act
        authService.logout("user@example.com");

        // Assert
        assertThat(mockUser.getSessionHash()).isNull();
        verify(userRepository, times(1)).save(mockUser);
        verify(auditLogService, times(1)).publish(any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void refreshSession_ShouldReturnToken() {
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(jwtProvider.generateToken(any(), any(), any(), any(), anyBoolean())).thenReturn("refreshed-token");

        String token = authService.refreshSession(mockUser);

        assertThat(token).isEqualTo("refreshed-token");
    }

    @Test
    void verifySignupOtp_ShouldSucceed_WhenOtpValid() {
        when(otpService.validateOtp("test@example.com", "123456")).thenReturn(true);

        VerifyOtpRequest request = new VerifyOtpRequest();
        request.setEmail("test@example.com");
        request.setOtp("123456");

        authService.verifySignupOtp(request);
        verify(otpService).validateOtp("test@example.com", "123456");
    }

    @Test
    void verifySignupOtp_ShouldThrowException_WhenOtpInvalid() {
        when(otpService.validateOtp("test@example.com", "123456")).thenReturn(false);

        VerifyOtpRequest request = new VerifyOtpRequest();
        request.setEmail("test@example.com");
        request.setOtp("123456");

        assertThatThrownBy(() -> authService.verifySignupOtp(request))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_OTP);
    }

    @Test
    void requestSignupOtp_ShouldThrowException_WhenDuplicateEmail() {
        when(userRepository.existsByEmail("test@example.com")).thenReturn(true);

        SignupOtpRequest request = new SignupOtpRequest();
        request.setEmail("test@example.com");

        assertThatThrownBy(() -> authService.requestSignupOtp(request))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.DUPLICATE_EMAIL);
    }

    @Test
    void signUp_ShouldThrowException_WhenRoleNotFound() {
        SignUpRequest request = new SignUpRequest();
        request.setEmail("user@example.com");
        request.setPassword("password123");
        request.setConfirmPassword("password123");
        request.setOtp("123456");
        request.setRecaptchaToken("local-dev-bypass");

        when(httpServletRequest.getServerName()).thenReturn("localhost");
        when(otpService.validateOtp("user@example.com", "123456")).thenReturn(true);
        when(userRepository.existsByEmail("user@example.com")).thenReturn(false);
        when(roleRepository.findByName("customer")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.signUp(request))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.ROLE_NOT_FOUND);
    }

    @Test
    void resetPassword_ShouldThrowException_WhenPasswordsDoNotMatch() {
        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setEmail("user@example.com");
        request.setOtp("654321");
        request.setNewPassword("newpassword123");
        request.setConfirmPassword("differentpassword");

        assertThatThrownBy(() -> authService.resetPassword(request))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.PASSWORDS_DO_NOT_MATCH);
    }

    @Test
    void resetPassword_ShouldThrowException_WhenUserNotFound() {
        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setEmail("user@example.com");
        request.setOtp("654321");
        request.setNewPassword("newpassword123");
        request.setConfirmPassword("newpassword123");

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.resetPassword(request))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.USER_NOT_FOUND);
    }

    @Test
    void resetPassword_ShouldThrowException_WhenOtpInvalid() {
        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setEmail("user@example.com");
        request.setOtp("654321");
        request.setNewPassword("newpassword123");
        request.setConfirmPassword("newpassword123");

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(mockUser));
        when(otpService.validateOtp("user@example.com", "654321")).thenReturn(false);

        assertThatThrownBy(() -> authService.resetPassword(request))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_OTP);
    }

    @Test
    void loginWithGoogle_ShouldSuccess_WhenTokenValid() {
        GoogleLoginRequest request = new GoogleLoginRequest();
        request.setIdToken("valid-id-token");

        when(userRepository.findByEmail("google@example.com")).thenReturn(Optional.of(mockUser));
        when(jwtProvider.generateToken(any(), any(), any(), any(), anyBoolean())).thenReturn("jwt-token");

        try (var mockedRest = mockConstruction(org.springframework.web.client.RestTemplate.class, (mock, context) -> {
            when(mock.getForObject(any(String.class), any(Class.class), any(Object[].class))).thenReturn(java.util.Map.of("email", "google@example.com", "name", "Google User"));
        })) {
            JwtAuthenticationResponse response = authService.loginWithGoogle(request);
            assertThat(response).isNotNull();
            assertThat(response.getToken()).isEqualTo("jwt-token");
        }
    }

    @Test
    void loginWithGitHub_ShouldSuccess_WhenCodeValid() {
        GitHubLoginRequest request = new GitHubLoginRequest();
        request.setCode("valid-github-code");

        when(userRepository.findByGithubId("999")).thenReturn(Optional.of(mockUser));
        when(encryptionUtils.encrypt(any())).thenReturn("encrypted-token");
        when(userRepository.save(any(User.class))).thenReturn(mockUser);
        when(jwtProvider.generateToken(any(), any(), any(), any(), anyBoolean())).thenReturn("jwt-token");

        org.springframework.http.ResponseEntity<java.util.Map> responseEntity = new org.springframework.http.ResponseEntity<>(
                java.util.Map.of("id", 999L, "login", "gituser", "email", "git@example.com"),
                org.springframework.http.HttpStatus.OK
        );

        try (var mockedRest = mockConstruction(org.springframework.web.client.RestTemplate.class, (mock, context) -> {
            when(mock.postForObject(any(String.class), any(), any(Class.class), any(Object[].class)))
                    .thenReturn(java.util.Map.of("access_token", "github-token"));
            when(mock.postForObject(any(String.class), any(), any(Class.class)))
                    .thenReturn(java.util.Map.of("access_token", "github-token"));
            when(mock.exchange(any(String.class), any(org.springframework.http.HttpMethod.class), any(org.springframework.http.HttpEntity.class), any(Class.class), any(Object[].class)))
                    .thenReturn(responseEntity);
            when(mock.exchange(any(String.class), any(org.springframework.http.HttpMethod.class), any(org.springframework.http.HttpEntity.class), any(Class.class)))
                    .thenReturn(responseEntity);
        })) {
            JwtAuthenticationResponse response = authService.loginWithGitHub(request);
            assertThat(response).isNotNull();
            assertThat(response.getToken()).isEqualTo("jwt-token");
        }
    }

    @Test
    void requestPasswordReset_ShouldSendEmail_WhenUserExists() {
        ForgotPasswordRequest request = new ForgotPasswordRequest();
        request.setEmail("user@example.com");

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(mockUser));
        when(otpService.generateOtp("user@example.com")).thenReturn("123456");

        authService.requestPasswordReset(request);

        verify(emailService).sendOtpEmail("user@example.com", "123456");
    }

    @Test
    void logout_ShouldClearSessionHash_WhenUserExists() {
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(mockUser));

        authService.logout("user@example.com");

        assertThat(mockUser.getSessionHash()).isNull();
        verify(userRepository).save(mockUser);
    }

    @Test
    void signUp_ShouldSucceed_WithRealRecaptchaVerification() throws Exception {
        SignUpRequest request = new SignUpRequest();
        request.setEmail("user@example.com");
        request.setPassword("password123");
        request.setConfirmPassword("password123");
        request.setFullName("Test User");
        request.setOtp("123456");
        request.setRecaptchaToken("real-token");

        // Set private field recaptchaSecretKey
        java.lang.reflect.Field field = AuthServiceImpl.class.getDeclaredField("recaptchaSecretKey");
        field.setAccessible(true);
        field.set(authService, "my-secret-key");

        when(otpService.validateOtp("user@example.com", "123456")).thenReturn(true);
        when(userRepository.existsByEmail("user@example.com")).thenReturn(false);
        when(roleRepository.findByName("customer")).thenReturn(Optional.of(customerRole));
        when(passwordEncoder.encode("password123")).thenReturn("hashed_password");
        when(userRepository.save(any(User.class))).thenReturn(mockUser);

        try (var mockedRest = mockConstruction(org.springframework.web.client.RestTemplate.class, (mock, context) -> {
            when(mock.postForObject(any(String.class), any(), any(Class.class))).thenReturn(java.util.Map.of("success", true));
        })) {
            UserResponse response = authService.signUp(request);
            assertThat(response).isNotNull();
            assertThat(response.getEmail()).isEqualTo("user@example.com");
        }

        // Clean up field for other tests
        field.set(authService, null);
    }

    @Test
    void signUp_ShouldThrowException_WhenRecaptchaVerificationFails() throws Exception {
        SignUpRequest request = new SignUpRequest();
        request.setEmail("user@example.com");
        request.setPassword("password123");
        request.setConfirmPassword("password123");
        request.setOtp("123456");
        request.setRecaptchaToken("real-token");

        // Set private field recaptchaSecretKey
        java.lang.reflect.Field field = AuthServiceImpl.class.getDeclaredField("recaptchaSecretKey");
        field.setAccessible(true);
        field.set(authService, "my-secret-key");

        try (var mockedRest = mockConstruction(org.springframework.web.client.RestTemplate.class, (mock, context) -> {
            when(mock.postForObject(any(String.class), any(), any(Class.class))).thenReturn(java.util.Map.of("success", false));
        })) {
            assertThatThrownBy(() -> authService.signUp(request))
                    .isInstanceOf(AppException.class)
                    .extracting(e -> ((AppException) e).getErrorCode())
                    .isEqualTo(ErrorCode.INVALID_RECAPTCHA);
        }

        // Clean up field for other tests
        field.set(authService, null);
    }
}
