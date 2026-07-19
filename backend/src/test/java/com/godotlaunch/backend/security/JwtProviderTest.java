package com.godotlaunch.backend.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class JwtProviderTest {

    private JwtProvider jwtProvider;

    private String username;
    private UUID userId;
    private String role;
    private String sessionSecret;

    @BeforeEach
    void setUp() {
        jwtProvider = new JwtProvider();
        username = "testuser@example.com";
        userId = UUID.randomUUID();
        role = "DEVELOPER";
        sessionSecret = UUID.randomUUID().toString();
    }

    @Test
    @DisplayName("Should generate valid token with standard expiration when rememberMe is false")
    void shouldGenerateToken_WhenStandardExpiration() {
        // Act
        String token = jwtProvider.generateToken(username, userId, role, sessionSecret);

        // Assert
        assertThat(token).isNotBlank();
        assertThat(jwtProvider.validateToken(token)).isTrue();
        assertThat(jwtProvider.getUsernameFromToken(token)).isEqualTo(username);
        assertThat(jwtProvider.getUserIdFromToken(token)).isEqualTo(userId);
        assertThat(jwtProvider.getRoleFromToken(token)).isEqualTo(role);
        assertThat(jwtProvider.getSessionSecretFromToken(token)).isEqualTo(sessionSecret);
    }

    @Test
    @DisplayName("Should generate valid token when rememberMe is true")
    void shouldGenerateToken_WhenRememberMeIsTrue() {
        // Act
        String token = jwtProvider.generateToken(username, userId, role, sessionSecret, true);

        // Assert
        assertThat(token).isNotBlank();
        assertThat(jwtProvider.validateToken(token)).isTrue();
        assertThat(jwtProvider.getUsernameFromToken(token)).isEqualTo(username);
        assertThat(jwtProvider.getUserIdFromToken(token)).isEqualTo(userId);
    }

    @Test
    @DisplayName("Should return false when token is invalid or malformed")
    void shouldReturnFalse_WhenTokenIsInvalid() {
        // Arrange
        String malformedToken = "invalid.token.str";

        // Act
        boolean isValid = jwtProvider.validateToken(malformedToken);

        // Assert
        assertThat(isValid).isFalse();
    }

    @Test
    @DisplayName("Should return false when token is null")
    void shouldReturnFalse_WhenTokenIsNull() {
        // Act
        boolean isValid = jwtProvider.validateToken(null);

        // Assert
        assertThat(isValid).isFalse();
    }

    @Test
    @DisplayName("Should hash sessionSecret into SHA-256 Base64 string successfully")
    void shouldHashSessionSecret_Successfully() {
        // Act
        String hash1 = JwtProvider.hashSessionSecret(sessionSecret);
        String hash2 = JwtProvider.hashSessionSecret(sessionSecret);

        // Assert
        assertThat(hash1).isNotBlank();
        assertThat(hash1).isEqualTo(hash2);
    }
}
