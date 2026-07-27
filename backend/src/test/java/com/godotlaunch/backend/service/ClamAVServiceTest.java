package com.godotlaunch.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import xyz.capybara.clamav.ClamavClient;
import xyz.capybara.clamav.commands.scan.result.ScanResult;

import java.io.ByteArrayInputStream;
import java.io.InputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ClamAVServiceTest {

    @Mock
    private ClamavClient clamavClient;

    private ClamAVService clamAVService;

    @BeforeEach
    void setUp() {
        clamAVService = new ClamAVService("localhost", 3310);
        ReflectionTestUtils.setField(clamAVService, "clamavClient", clamavClient);
    }

    @Test
    @DisplayName("shouldReturnTrue_WhenScanClean")
    void shouldReturnTrue_WhenScanClean() {
        InputStream stream = new ByteArrayInputStream("clean data".getBytes());
        ScanResult.OK okResult = mock(ScanResult.OK.class);
        when(clamavClient.scan(stream)).thenReturn(okResult);

        boolean result = clamAVService.scanStream(stream);

        assertThat(result).isTrue();
        verify(clamavClient, times(1)).scan(stream);
    }

    @Test
    @DisplayName("shouldReturnFalse_WhenScanInfected")
    void shouldReturnFalse_WhenScanInfected() {
        InputStream stream = new ByteArrayInputStream("infected data".getBytes());
        ScanResult.VirusFound foundResult = mock(ScanResult.VirusFound.class);
        when(clamavClient.scan(stream)).thenReturn(foundResult);

        boolean result = clamAVService.scanStream(stream);

        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("shouldThrowRuntimeException_WhenClientFails")
    void shouldThrowRuntimeException_WhenClientFails() {
        InputStream stream = new ByteArrayInputStream("data".getBytes());
        when(clamavClient.scan(stream)).thenThrow(new RuntimeException("Connection failed"));

        assertThatThrownBy(() -> clamAVService.scanStream(stream))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Lỗi khi kết nối đến ClamAV");
    }
}
