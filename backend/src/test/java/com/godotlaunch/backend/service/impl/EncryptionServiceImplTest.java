package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.service.EncryptionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class EncryptionServiceImplTest {

    private EncryptionService encryptionService;

    @BeforeEach
    void setUp() {
        encryptionService = new EncryptionServiceImpl("godot-launch-test-encryption-key-12345");
    }

    @Test
    void encryptAndDecrypt_ShouldReturnOriginalText() {
        String originalText = "my-github-access-token-123456";

        String encrypted = encryptionService.encrypt(originalText);
        assertNotNull(encrypted);
        assertNotEquals(originalText, encrypted);

        String decrypted = encryptionService.decrypt(encrypted);
        assertEquals(originalText, decrypted);
    }

    @Test
    void encrypt_ShouldReturnNull_WhenPlainTextIsNull() {
        assertNull(encryptionService.encrypt(null));
    }

    @Test
    void decrypt_ShouldReturnNull_WhenCipherTextIsNull() {
        assertNull(encryptionService.decrypt(null));
    }

    @Test
    void decrypt_ShouldThrowException_WhenCipherTextIsInvalid() {
        assertThrows(RuntimeException.class, () -> {
            encryptionService.decrypt("short");
        });

        assertThrows(RuntimeException.class, () -> {
            encryptionService.decrypt("invalid-base-64-string-abcde!");
        });
    }
}
