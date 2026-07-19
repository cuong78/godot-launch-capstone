package com.godotlaunch.backend.service.impl;

import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.test.util.ReflectionTestUtils;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailServiceImplTest {

    @Mock
    private JavaMailSender mailSender;

    private EmailServiceImpl emailService;
    private MimeMessage realMimeMessage;

    @BeforeEach
    void setUp() {
        emailService = new EmailServiceImpl(mailSender);
        ReflectionTestUtils.setField(emailService, "senderEmail", "noreply@godotlaunch.com");
        realMimeMessage = new JavaMailSenderImpl().createMimeMessage();
        when(mailSender.createMimeMessage()).thenReturn(realMimeMessage);
    }

    @Test
    @DisplayName("Should send game status notification email when approved")
    void shouldSendGameStatusNotification_Approved() {
        // Act
        emailService.sendGameStatusNotification("dev@example.com", "Super Game", "APPROVED", "Great job!");

        // Assert
        verify(mailSender, times(1)).createMimeMessage();
        verify(mailSender, times(1)).send(realMimeMessage);
    }

    @Test
    @DisplayName("Should send game status notification email when contract proposed")
    void shouldSendGameStatusNotification_ContractProposed() {
        // Act
        emailService.sendGameStatusNotification("dev@example.com", "Super Game", "APPROVED_CONTRACT", null);

        // Assert
        verify(mailSender, times(1)).send(realMimeMessage);
    }

    @Test
    @DisplayName("Should send asset status notification email when rejected")
    void shouldSendAssetStatusNotification_Rejected() {
        // Act
        emailService.sendAssetStatusNotification("dev@example.com", "3D Model Pack", "REJECTED", "Low quality textures");

        // Assert
        verify(mailSender, times(1)).send(realMimeMessage);
    }

    @Test
    @DisplayName("Should send password reset OTP email")
    void shouldSendOtpEmail() {
        // Act
        emailService.sendOtpEmail("user@example.com", "123456");

        // Assert
        verify(mailSender, times(1)).send(realMimeMessage);
    }

    @Test
    @DisplayName("Should send signup OTP email")
    void shouldSendSignupOtpEmail() {
        // Act
        emailService.sendSignupOtpEmail("newuser@example.com", "654321");

        // Assert
        verify(mailSender, times(1)).send(realMimeMessage);
    }

    @Test
    @DisplayName("Should send general notification email")
    void shouldSendNotificationEmail() {
        // Act
        emailService.sendNotificationEmail("user@example.com", "System Alert", "Your account settings have been updated.");

        // Assert
        verify(mailSender, times(1)).send(realMimeMessage);
    }

    @Test
    @DisplayName("Should handle MailException gracefully and fallback to simulated console log")
    void shouldHandleMailException_Gracefully() {
        // Arrange
        doThrow(new RuntimeException("SMTP Server Unavailable")).when(mailSender).send(any(MimeMessage.class));

        // Act & Assert (does not throw exception)
        emailService.sendOtpEmail("user@example.com", "123456");

        verify(mailSender, times(1)).send(any(MimeMessage.class));
    }
}
