package com.godotlaunch.backend.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SafeZipUnpackerTest {

    @Test
    @DisplayName("unzipSafely_ShouldUnzipSuccessfully_WhenValidZip")
    void unzipSafely_ShouldUnzipSuccessfully_WhenValidZip(@TempDir Path tempDir) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            zos.putNextEntry(new ZipEntry("dir1/"));
            zos.closeEntry();
            zos.putNextEntry(new ZipEntry("dir1/file1.txt"));
            zos.write("content1".getBytes());
            zos.closeEntry();
        }

        ByteArrayInputStream bais = new ByteArrayInputStream(baos.toByteArray());
        SafeZipUnpacker.unzipSafely(bais, tempDir);

        Path file1 = tempDir.resolve("dir1/file1.txt");
        assertThat(file1).exists();
        assertThat(Files.readString(file1)).isEqualTo("content1");
    }

    @Test
    @DisplayName("unzipSafely_ShouldThrowSecurityException_WhenZipSlipAttempt")
    void unzipSafely_ShouldThrowSecurityException_WhenZipSlipAttempt(@TempDir Path tempDir) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            zos.putNextEntry(new ZipEntry("../outside.txt"));
            zos.write("escaped content".getBytes());
            zos.closeEntry();
        }

        ByteArrayInputStream bais = new ByteArrayInputStream(baos.toByteArray());

        assertThatThrownBy(() -> SafeZipUnpacker.unzipSafely(bais, tempDir))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("Phát hiện hành vi phá hoại bảo mật (Zip Slip)");
    }

    @Test
    @DisplayName("unzipSafely_ShouldThrowIllegalStateException_WhenTooManyFiles")
    void unzipSafely_ShouldThrowIllegalStateException_WhenTooManyFiles(@TempDir Path tempDir) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            for (int i = 0; i < 1002; i++) {
                zos.putNextEntry(new ZipEntry("file_" + i + ".txt"));
                zos.write("a".getBytes());
                zos.closeEntry();
            }
        }

        ByteArrayInputStream bais = new ByteArrayInputStream(baos.toByteArray());

        assertThatThrownBy(() -> SafeZipUnpacker.unzipSafely(bais, tempDir))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Số lượng file con vượt giới hạn 1000 file");
    }

    @Test
    @DisplayName("unzipSafely_ShouldThrowIllegalStateException_WhenTotalSizeTooLarge")
    void unzipSafely_ShouldThrowIllegalStateException_WhenTotalSizeTooLarge(@TempDir Path tempDir) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            zos.putNextEntry(new ZipEntry("huge_file.dat"));
            // Simulate a large uncompressed size (e.g. 524288001 bytes, which is slightly above 500MB limit)
            // But we don't want to consume 500MB heap in tests, so we write a custom InputStream or zip stream
            // In the SafeZipUnpacker, totalSize is accumulated dynamically by the read buffer loop:
            // "totalSize += len; if (totalSize > MAX_UNZIPPED_SIZE)"
            // To trigger this, we can write a mock payload that is large
            // But we can also simulate it. Writing 501MB in-memory is too heavy.
            // Wait, is there a way to write a test without allocating 500MB memory?
            // Yes, SafeZipUnpacker reads from ZipInputStream in a loop.
            // If the ZipInputStream returns infinite stream or we mock ZipInputStream?
            // Let's mock ZipInputStream! Or just write a small payload but loop many times?
            // Actually, we can write a test that creates a zip entry of a specific size,
            // or just mock ZipInputStream methods.
            // But mocking ZipInputStream is a bit complicated.
            // Wait, we can test it by writing a compressed entry with large size?
            // ZIP compression makes it small in ZIP format, but uncompressed size is large!
            // E.g., 501MB of zeroes compresses down to less than 1MB!
            // Yes, 501MB of zeroes compresses to extremely small size!
            // Let's write 524,288,001 bytes of zeroes to ZipOutputStream.
            // Because they are all zeroes, Java's deflate algorithm will compress it to a few kilobytes!
            // This is perfect! It will not consume memory for the zip file itself, 
            // and during decompression we throw the exception immediately when it hits the limit,
            // so we don't actually write 500MB to disk! The exception is thrown at exactly 500MB,
            // preventing the write!
            // Let's do that!
            byte[] zeroes = new byte[8192];
            long bytesToWrite = 524288000L + 8192L;
            long written = 0;
            while (written < bytesToWrite) {
                long chunk = Math.min(zeroes.length, bytesToWrite - written);
                zos.write(zeroes, 0, (int) chunk);
                written += chunk;
            }
            zos.closeEntry();
        }

        ByteArrayInputStream bais = new ByteArrayInputStream(baos.toByteArray());

        assertThatThrownBy(() -> SafeZipUnpacker.unzipSafely(bais, tempDir))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Kích thước tổng sau giải nén vượt giới hạn 500MB");
    }
}
