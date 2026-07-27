package com.godotlaunch.backend.service;

import com.godotlaunch.backend.service.impl.SeaweedFsAdapter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.http.HttpClient;
import java.net.http.HttpResponse;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SeaweedFsServiceTest {

    @Mock
    private SeaweedFsAdapter seaweedAdapter;

    @Mock
    private HttpClient httpClient;

    @Mock
    private HttpResponse<String> httpResponse;

    private SeaweedFsService seaweedFsService;

    @BeforeEach
    void setUp() {
        seaweedFsService = new SeaweedFsService("localhost", 8888, "localhost", 8888, "/godotlaunch");
        ReflectionTestUtils.setField(seaweedFsService, "seaweedAdapter", seaweedAdapter);
        ReflectionTestUtils.setField(seaweedFsService, "httpClient", httpClient);
    }

    @Test
    @DisplayName("shouldResolvePublicUrl_WhenCalled")
    void shouldResolvePublicUrl_WhenCalled() {
        String resolved = seaweedFsService.resolvePublicUrl("http://localhost:8888/godotlaunch/file.png");
        assertThat(resolved).isEqualTo("http://localhost:8888/godotlaunch/file.png");

        String resolvedFiler = seaweedFsService.resolvePublicUrl("http://seaweedfs-filer:8888/godotlaunch/file.png");
        assertThat(resolvedFiler).isEqualTo("http://localhost:8888/godotlaunch/file.png");

        assertThat(seaweedFsService.resolvePublicUrl(null)).isNull();
    }

    @Test
    @DisplayName("shouldGeneratePresignedUploadUrl_WhenCalled")
    void shouldGeneratePresignedUploadUrl_WhenCalled() {
        when(seaweedAdapter.getPublicUrl("key")).thenReturn("http://public/key");
        String url = seaweedFsService.generatePresignedUploadUrl("key", "image/png");
        assertThat(url).isEqualTo("http://public/key");
    }

    @Test
    @DisplayName("shouldGeneratePresignedGetUrl_WhenCalled")
    void shouldGeneratePresignedGetUrl_WhenCalled() {
        when(seaweedAdapter.getPublicUrl("key")).thenReturn("http://public/key");
        String url = seaweedFsService.generatePresignedGetUrl("key", Duration.ofMinutes(5));
        assertThat(url).isEqualTo("http://public/key");
    }

    @Test
    @DisplayName("shouldGetFileUrl_WhenCalled")
    void shouldGetFileUrl_WhenCalled() {
        when(seaweedAdapter.getPublicUrl("key")).thenReturn("http://public/key");
        String url = seaweedFsService.getFileUrl("key");
        assertThat(url).isEqualTo("http://public/key");
    }

    @Test
    @DisplayName("shouldExtractObjectKey_WhenCalled")
    void shouldExtractObjectKey_WhenCalled() {
        when(seaweedAdapter.extractObjectKey("http://public/key")).thenReturn("key");
        String key = seaweedFsService.extractObjectKey("http://public/key");
        assertThat(key).isEqualTo("key");
        assertThat(seaweedFsService.extractObjectKey(null)).isNull();
    }

    @Test
    @DisplayName("shouldGetObjectStream_WhenCalled")
    void shouldGetObjectStream_WhenCalled() {
        InputStream stream = new ByteArrayInputStream("data".getBytes());
        when(seaweedAdapter.readFile("key")).thenReturn(stream);
        InputStream result = seaweedFsService.getObjectStream("key");
        assertThat(result).isEqualTo(stream);
    }

    @Test
    @DisplayName("shouldDeleteObject_WhenCalled")
    void shouldDeleteObject_WhenCalled() {
        doNothing().when(seaweedAdapter).delete("key");
        seaweedFsService.deleteObject("key");
        verify(seaweedAdapter, times(1)).delete("key");
    }

    @Test
    @DisplayName("shouldDeleteObjectRecursive_WhenCalled")
    void shouldDeleteObjectRecursive_WhenCalled() {
        doNothing().when(seaweedAdapter).deleteRecursive("prefix");
        seaweedFsService.deleteObjectRecursive("prefix");
        verify(seaweedAdapter, times(1)).deleteRecursive("prefix");
    }

    @Test
    @DisplayName("shouldUploadFile_WhenCalled")
    void shouldUploadFile_WhenCalled() {
        MultipartFile file = new MockMultipartFile("file", "test.txt", "text/plain", "hello".getBytes());
        when(seaweedAdapter.upload(eq(file), anyString())).thenReturn("http://url");
        String url = seaweedFsService.uploadFile(file, "prefix");
        assertThat(url).isEqualTo("http://url");
    }

    @Test
    @DisplayName("shouldUploadWithKey_WhenCalled")
    void shouldUploadWithKey_WhenCalled() {
        MultipartFile file = new MockMultipartFile("file", "test.txt", "text/plain", "hello".getBytes());
        when(seaweedAdapter.upload(file, "key")).thenReturn("http://url");
        String url = seaweedFsService.uploadWithKey(file, "key");
        assertThat(url).isEqualTo("http://url");
    }

    @Test
    @DisplayName("shouldUploadStream_WhenSuccess")
    void shouldUploadStream_WhenSuccess() throws Exception {
        InputStream stream = new ByteArrayInputStream("data".getBytes());
        when(httpResponse.statusCode()).thenReturn(200);
        doReturn(httpResponse).when(httpClient).send(any(), any());
        when(seaweedAdapter.getPublicUrl("key")).thenReturn("http://public/key");

        String url = seaweedFsService.uploadStream(stream, "key", "text/plain", "max-age=3600");
        assertThat(url).isEqualTo("http://public/key");
    }

    @Test
    @DisplayName("shouldUploadStream_WhenFailure")
    void shouldUploadStream_WhenFailure() throws Exception {
        InputStream stream = new ByteArrayInputStream("data".getBytes());
        when(httpResponse.statusCode()).thenReturn(500);
        when(httpResponse.body()).thenReturn("Error body");
        doReturn(httpResponse).when(httpClient).send(any(), any());

        assertThatThrownBy(() -> seaweedFsService.uploadStream(stream, "key", "text/plain", ""))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Failed to upload stream to SeaweedFS via HTTP");
    }
}
