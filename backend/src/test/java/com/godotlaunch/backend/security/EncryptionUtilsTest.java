package com.godotlaunch.backend.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@ExtendWith(MockitoExtension.class)
class EncryptionUtilsTest {

    private EncryptionUtils encryptionUtils;
    private final String secretKeyStr = "1234567890123456";

    @BeforeEach
    void setUp() {
        encryptionUtils = new EncryptionUtils(secretKeyStr);
    }

    @Test
    @DisplayName("Should encrypt and decrypt text successfully")
    void shouldEncryptAndDecrypt_Successfully() {
        // Arrange
        String plainText = "github-oauth-secret-token-12345";

        // Act
        String encrypted = encryptionUtils.encrypt(plainText);
        String decrypted = encryptionUtils.decrypt(encrypted);

        // Assert
        assertThat(encrypted).isNotNull();
        assertThat(encrypted).isNotEqualTo(plainText);
        assertThat(decrypted).isEqualTo(plainText);
    }

    @Test
    @DisplayName("Should return null when encrypting or decrypting null input")
    void shouldReturnNull_WhenInputIsNull() {
        // Act & Assert
        assertThat(encryptionUtils.encrypt(null)).isNull();
        assertThat(encryptionUtils.decrypt(null)).isNull();
    }

    @Test
    @DisplayName("Should throw RuntimeException when decrypting corrupted ciphertext")
    void shouldThrowException_WhenDecryptingCorruptedText() {
        // Arrange
        String invalidEncrypted = "not-a-valid-base64-aes-ciphertext";

        // Act & Assert
        assertThatThrownBy(() -> encryptionUtils.decrypt(invalidEncrypted))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Failed to decrypt token");
    }
}
