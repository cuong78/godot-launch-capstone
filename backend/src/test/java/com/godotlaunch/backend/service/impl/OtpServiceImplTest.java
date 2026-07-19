package com.godotlaunch.backend.service.impl;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class OtpServiceImplTest {

    private OtpServiceImpl otpService;
    private String email;

    @BeforeEach
    void setUp() {
        otpService = new OtpServiceImpl();
        email = "test@example.com";
    }

    @Test
    @DisplayName("Should generate valid 6-digit numeric OTP")
    void shouldGenerateOtp_Valid6DigitFormat() {
        // Act
        String otp = otpService.generateOtp(email);

        // Assert
        assertThat(otp).isNotNull();
        assertThat(otp).matches("^\\d{6}$");
    }

    @Test
    @DisplayName("Should return true when validating correct OTP before expiration")
    void shouldValidateOtp_True_WhenCorrectOtp() {
        // Arrange
        String otp = otpService.generateOtp(email);

        // Act
        boolean isValid = otpService.validateOtp(email, otp);

        // Assert
        assertThat(isValid).isTrue();
    }

    @Test
    @DisplayName("Should return false when validating incorrect OTP")
    void shouldValidateOtp_False_WhenIncorrectOtp() {
        // Arrange
        otpService.generateOtp(email);

        // Act
        boolean isValid = otpService.validateOtp(email, "000000");

        // Assert
        assertThat(isValid).isFalse();
    }

    @Test
    @DisplayName("Should return false when validating non-existent OTP for unrequested email")
    void shouldValidateOtp_False_WhenEmailNotFound() {
        // Act
        boolean isValid = otpService.validateOtp("nonexistent@example.com", "123456");

        // Assert
        assertThat(isValid).isFalse();
    }

    @Test
    @DisplayName("Should invalidate OTP and return false on subsequent validation")
    void shouldInvalidateOtp_Successfully() {
        // Arrange
        String otp = otpService.generateOtp(email);
        assertThat(otpService.validateOtp(email, otp)).isTrue();

        // Act
        otpService.invalidateOtp(email);

        // Assert
        assertThat(otpService.validateOtp(email, otp)).isFalse();
    }
}
