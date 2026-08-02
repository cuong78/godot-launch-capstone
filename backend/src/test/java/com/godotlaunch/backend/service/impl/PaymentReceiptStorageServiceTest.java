package com.godotlaunch.backend.service.impl;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.Resource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class PaymentReceiptStorageServiceTest {

    private PaymentReceiptStorageService service;
    private final Path baseDir = Path.of(System.getProperty("java.io.tmpdir"), "godotlaunch", "payment-receipts");

    @BeforeEach
    void setUp() throws IOException {
        service = new PaymentReceiptStorageService();
        Files.createDirectories(baseDir);
    }

    @AfterEach
    void tearDown() throws IOException {
        if (Files.exists(baseDir)) {
            Files.walk(baseDir)
                 .sorted(Comparator.reverseOrder())
                 .forEach(path -> {
                     try {
                         Files.delete(path);
                     } catch (IOException ignored) {}
                 });
        }
    }

    @Test
    void storeLocally_ShouldStoreFileAndReturnRef() {
        MockMultipartFile file = new MockMultipartFile(
                "receipt", "receipt.png", "image/png", "dummy-content".getBytes());

        String ref = service.storeLocally(file);

        assertThat(ref).startsWith("local://payment-receipts/");
        String filename = ref.substring("local://payment-receipts/".length());
        assertThat(Files.exists(baseDir.resolve(filename))).isTrue();
    }

    @Test
    void storeLocally_ShouldThrowException_WhenIOError() throws IOException {
        MultipartFile file = mock(MultipartFile.class);
        when(file.getOriginalFilename()).thenReturn("receipt.png");
        when(file.getInputStream()).thenThrow(new IOException("Read error"));

        assertThatThrownBy(() -> service.storeLocally(file))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Unable to store payment receipt locally.");
    }

    @Test
    void isLocalStorageRef_ShouldVerifyPrefix() {
        assertThat(service.isLocalStorageRef("local://payment-receipts/test.png")).isTrue();
        assertThat(service.isLocalStorageRef("http://remote/test.png")).isFalse();
        assertThat(service.isLocalStorageRef(null)).isFalse();
    }

    @Test
    void loadAsResource_ShouldThrowException_WhenNotLocalRef() {
        assertThatThrownBy(() -> service.loadAsResource("http://remote/test.png"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Payment receipt is not stored in local fallback storage.");
    }

    @Test
    void loadAsResource_ShouldThrowException_WhenFileDoesNotExist() {
        assertThatThrownBy(() -> service.loadAsResource("local://payment-receipts/nonexistent.png"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Payment receipt file does not exist or is not readable.");
    }

    @Test
    void loadAsResource_ShouldReturnResource_WhenFileExists() throws IOException {
        Path tempFile = baseDir.resolve("test.png");
        Files.writeString(tempFile, "dummy-content");

        Resource resource = service.loadAsResource("local://payment-receipts/test.png");

        assertThat(resource).isNotNull();
        assertThat(resource.exists()).isTrue();
    }
}
