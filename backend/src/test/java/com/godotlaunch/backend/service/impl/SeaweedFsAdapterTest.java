package com.godotlaunch.backend.service.impl;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SeaweedFsAdapterTest {

    private SeaweedFsAdapter seaweedFsAdapter;

    @BeforeEach
    void setUp() {
        seaweedFsAdapter = new SeaweedFsAdapter("localhost", 8888, "/godotlaunch");
    }

    @Test
    @DisplayName("shouldGeneratePublicUrl_WhenObjectKeyProvided")
    void shouldGeneratePublicUrl_WhenObjectKeyProvided() {
        // Act
        String publicUrl = seaweedFsAdapter.getPublicUrl("avatars/user_123.jpg");

        // Assert
        assertThat(publicUrl).isEqualTo("http://localhost:8888/godotlaunch/avatars/user_123.jpg");
    }

    @Test
    @DisplayName("shouldExtractObjectKey_WhenFullPublicUrlProvided")
    void shouldExtractObjectKey_WhenFullPublicUrlProvided() {
        // Arrange
        String publicUrl = "http://localhost:8888/godotlaunch/games/123/thumbnail.png";

        // Act
        String objectKey = seaweedFsAdapter.extractObjectKey(publicUrl);

        // Assert
        assertThat(objectKey).isEqualTo("games/123/thumbnail.png");
    }

    @Test
    @DisplayName("shouldExtractObjectKey_WithUrlEncodedCharacters")
    void shouldExtractObjectKey_WithUrlEncodedCharacters() {
        // Arrange
        String publicUrl = "http://localhost:8888/godotlaunch/games/123/my%20file.png";

        // Act
        String objectKey = seaweedFsAdapter.extractObjectKey(publicUrl);

        // Assert
        assertThat(objectKey).isEqualTo("games/123/my file.png");
    }
}
