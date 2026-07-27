package com.godotlaunch.backend.service.impl;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.any;

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

    @Test
    @DisplayName("upload_UTCID01_Success")
    void upload_UTCID01_Success() throws Exception {
        // Arrange
        java.net.http.HttpClient mockHttpClient = mock(java.net.http.HttpClient.class);
        org.springframework.test.util.ReflectionTestUtils.setField(seaweedFsAdapter, "httpClient", mockHttpClient);

        org.springframework.web.multipart.MultipartFile mockFile = mock(org.springframework.web.multipart.MultipartFile.class);
        when(mockFile.getInputStream()).thenReturn(new java.io.ByteArrayInputStream("file-data".getBytes()));
        when(mockFile.getContentType()).thenReturn("image/png");

        java.net.http.HttpResponse<String> mockResponse = mock(java.net.http.HttpResponse.class);
        when(mockResponse.statusCode()).thenReturn(200);

        when(mockHttpClient.send(any(java.net.http.HttpRequest.class), any(java.net.http.HttpResponse.BodyHandler.class)))
                .thenReturn(mockResponse);

        // Act
        String result = seaweedFsAdapter.upload(mockFile, "avatars/user.png");

        // Assert
        assertThat(result).isEqualTo("http://localhost:8888/godotlaunch/avatars/user.png");
    }

    @Test
    @DisplayName("upload_UTCID02_Failure")
    void upload_UTCID02_Failure() throws Exception {
        // Arrange
        java.net.http.HttpClient mockHttpClient = mock(java.net.http.HttpClient.class);
        org.springframework.test.util.ReflectionTestUtils.setField(seaweedFsAdapter, "httpClient", mockHttpClient);

        org.springframework.web.multipart.MultipartFile mockFile = mock(org.springframework.web.multipart.MultipartFile.class);
        when(mockFile.getInputStream()).thenReturn(new java.io.ByteArrayInputStream("file-data".getBytes()));
        when(mockFile.getContentType()).thenReturn("image/png");

        java.net.http.HttpResponse<String> mockResponse = mock(java.net.http.HttpResponse.class);
        when(mockResponse.statusCode()).thenReturn(500);
        when(mockResponse.body()).thenReturn("Internal Server Error");

        when(mockHttpClient.send(any(java.net.http.HttpRequest.class), any(java.net.http.HttpResponse.BodyHandler.class)))
                .thenReturn(mockResponse);

        // Act & Assert
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> seaweedFsAdapter.upload(mockFile, "avatars/user.png"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Failed to upload to SeaweedFS via HTTP");
    }

    @Test
    @DisplayName("delete_UTCID01_Success")
    void delete_UTCID01_Success() throws Exception {
        // Arrange
        java.net.http.HttpClient mockHttpClient = mock(java.net.http.HttpClient.class);
        org.springframework.test.util.ReflectionTestUtils.setField(seaweedFsAdapter, "httpClient", mockHttpClient);

        java.net.http.HttpResponse<String> mockResponse = mock(java.net.http.HttpResponse.class);
        when(mockResponse.statusCode()).thenReturn(204);

        when(mockHttpClient.send(any(java.net.http.HttpRequest.class), any(java.net.http.HttpResponse.BodyHandler.class)))
                .thenReturn(mockResponse);

        // Act
        seaweedFsAdapter.delete("avatars/user.png");

        // Assert
        verify(mockHttpClient, times(1)).send(any(java.net.http.HttpRequest.class), any(java.net.http.HttpResponse.BodyHandler.class));
    }

    @Test
    @DisplayName("delete_UTCID02_Failure")
    void delete_UTCID02_Failure() throws Exception {
        // Arrange
        java.net.http.HttpClient mockHttpClient = mock(java.net.http.HttpClient.class);
        org.springframework.test.util.ReflectionTestUtils.setField(seaweedFsAdapter, "httpClient", mockHttpClient);

        java.net.http.HttpResponse<String> mockResponse = mock(java.net.http.HttpResponse.class);
        when(mockResponse.statusCode()).thenReturn(500);
        when(mockResponse.body()).thenReturn("Delete error");

        when(mockHttpClient.send(any(java.net.http.HttpRequest.class), any(java.net.http.HttpResponse.BodyHandler.class)))
                .thenReturn(mockResponse);

        // Act & Assert
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> seaweedFsAdapter.delete("avatars/user.png"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Failed to delete from SeaweedFS via HTTP");
    }

    @Test
    @DisplayName("deleteRecursive_Success")
    void deleteRecursive_Success() throws Exception {
        java.net.http.HttpClient mockHttpClient = mock(java.net.http.HttpClient.class);
        org.springframework.test.util.ReflectionTestUtils.setField(seaweedFsAdapter, "httpClient", mockHttpClient);

        java.net.http.HttpResponse<String> mockResponse = mock(java.net.http.HttpResponse.class);
        when(mockResponse.statusCode()).thenReturn(200);

        when(mockHttpClient.send(any(java.net.http.HttpRequest.class), any(java.net.http.HttpResponse.BodyHandler.class)))
                .thenReturn(mockResponse);

        seaweedFsAdapter.deleteRecursive("games/123/web_demo");

        verify(mockHttpClient, times(1)).send(any(java.net.http.HttpRequest.class), any(java.net.http.HttpResponse.BodyHandler.class));
    }

    @Test
    @DisplayName("deleteRecursive_Failure")
    void deleteRecursive_Failure() throws Exception {
        java.net.http.HttpClient mockHttpClient = mock(java.net.http.HttpClient.class);
        org.springframework.test.util.ReflectionTestUtils.setField(seaweedFsAdapter, "httpClient", mockHttpClient);

        java.net.http.HttpResponse<String> mockResponse = mock(java.net.http.HttpResponse.class);
        when(mockResponse.statusCode()).thenReturn(500);

        when(mockHttpClient.send(any(java.net.http.HttpRequest.class), any(java.net.http.HttpResponse.BodyHandler.class)))
                .thenReturn(mockResponse);

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> seaweedFsAdapter.deleteRecursive("games/123/web_demo"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Failed to recursively delete directory");
    }

    @Test
    @DisplayName("readFile_Success")
    void readFile_Success() throws Exception {
        java.net.http.HttpClient mockHttpClient = mock(java.net.http.HttpClient.class);
        org.springframework.test.util.ReflectionTestUtils.setField(seaweedFsAdapter, "httpClient", mockHttpClient);

        java.net.http.HttpResponse<java.io.InputStream> mockResponse = mock(java.net.http.HttpResponse.class);
        when(mockResponse.statusCode()).thenReturn(200);
        java.io.ByteArrayInputStream mockStream = new java.io.ByteArrayInputStream("data".getBytes());
        when(mockResponse.body()).thenReturn(mockStream);

        when(mockHttpClient.send(any(java.net.http.HttpRequest.class), any(java.net.http.HttpResponse.BodyHandler.class)))
                .thenReturn(mockResponse);

        java.io.InputStream result = seaweedFsAdapter.readFile("avatars/user.png");

        assertThat(result).isSameAs(mockStream);
    }

    @Test
    @DisplayName("readFile_Failure")
    void readFile_Failure() throws Exception {
        java.net.http.HttpClient mockHttpClient = mock(java.net.http.HttpClient.class);
        org.springframework.test.util.ReflectionTestUtils.setField(seaweedFsAdapter, "httpClient", mockHttpClient);

        java.net.http.HttpResponse<java.io.InputStream> mockResponse = mock(java.net.http.HttpResponse.class);
        when(mockResponse.statusCode()).thenReturn(404);

        when(mockHttpClient.send(any(java.net.http.HttpRequest.class), any(java.net.http.HttpResponse.BodyHandler.class)))
                .thenReturn(mockResponse);

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> seaweedFsAdapter.readFile("avatars/user.png"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Failed to read from SeaweedFS");
    }

    @Test
    @DisplayName("extractObjectKey_NullOrEmpty")
    void extractObjectKey_NullOrEmpty() {
        String result = seaweedFsAdapter.extractObjectKey("http://localhost:8888");
        assertThat(result).isNull();
    }
}
