package com.godotlaunch.backend.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.File;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class ByteArrayMultipartFileTest {

    @Test
    @DisplayName("shouldRetrieveCorrectMetadata")
    void shouldRetrieveCorrectMetadata() throws Exception {
        byte[] content = "Hello World".getBytes();
        ByteArrayMultipartFile multipartFile = new ByteArrayMultipartFile(content, "fileField", "hello.txt", "text/plain");

        assertThat(multipartFile.getName()).isEqualTo("fileField");
        assertThat(multipartFile.getOriginalFilename()).isEqualTo("hello.txt");
        assertThat(multipartFile.getContentType()).isEqualTo("text/plain");
        assertThat(multipartFile.isEmpty()).isFalse();
        assertThat(multipartFile.getSize()).isEqualTo(content.length);
        assertThat(multipartFile.getBytes()).isEqualTo(content);

        try (InputStream is = multipartFile.getInputStream()) {
            byte[] readBytes = is.readAllBytes();
            assertThat(readBytes).isEqualTo(content);
        }
    }

    @Test
    @DisplayName("shouldHandleEmptyContent")
    void shouldHandleEmptyContent() {
        ByteArrayMultipartFile emptyFile = new ByteArrayMultipartFile(new byte[0], "fileField", "hello.txt", "text/plain");
        assertThat(emptyFile.isEmpty()).isTrue();
        assertThat(emptyFile.getSize()).isZero();

        ByteArrayMultipartFile nullFile = new ByteArrayMultipartFile(null, "fileField", "hello.txt", "text/plain");
        assertThat(nullFile.isEmpty()).isTrue();
        assertThat(nullFile.getSize()).isZero();
    }

    @Test
    @DisplayName("shouldTransferToDestFileAndPath")
    void shouldTransferToDestFileAndPath(@TempDir Path tempDir) throws Exception {
        byte[] content = "File content".getBytes();
        ByteArrayMultipartFile multipartFile = new ByteArrayMultipartFile(content, "fileField", "hello.txt", "text/plain");

        File destFile = tempDir.resolve("dest_file.txt").toFile();
        multipartFile.transferTo(destFile);
        assertThat(destFile).exists();
        assertThat(Files.readAllBytes(destFile.toPath())).isEqualTo(content);

        Path destPath = tempDir.resolve("dest_path.txt");
        multipartFile.transferTo(destPath);
        assertThat(destPath).exists();
        assertThat(Files.readAllBytes(destPath)).isEqualTo(content);
    }
}
