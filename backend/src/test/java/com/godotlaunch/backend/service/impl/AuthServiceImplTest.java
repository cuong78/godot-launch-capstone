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
}
