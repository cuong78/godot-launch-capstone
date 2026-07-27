package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.service.DownloadService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.io.ByteArrayInputStream;
import java.security.Principal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DownloadControllerTest {

    @Mock
    private DownloadService downloadService;

    @Mock
    private Principal principal;

    @Mock
    private HttpServletRequest request;

    @InjectMocks
    private DownloadController downloadController;

    @Test
    @DisplayName("shouldDownloadPurchase_WhenAuthorizedAndOwned")
    void shouldDownloadPurchase_WhenAuthorizedAndOwned() {
        // Arrange
        UUID purchaseId = UUID.randomUUID();
        String email = "buyer@godotlaunch.dev";
        ByteArrayInputStream bais = new ByteArrayInputStream("zip-data".getBytes());
        DownloadService.DownloadResource resource = new DownloadService.DownloadResource(bais, "game.zip");

        when(principal.getName()).thenReturn(email);
        when(request.getHeader("X-Forwarded-For")).thenReturn("1.2.3.4");
        when(request.getHeader(HttpHeaders.USER_AGENT)).thenReturn("Mozilla/5.0");
        when(downloadService.downloadPurchase(purchaseId, email, "1.2.3.4", "Mozilla/5.0")).thenReturn(resource);

        // Act
        ResponseEntity<InputStreamResource> response = downloadController.downloadPurchase(purchaseId, principal, request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getContentDisposition().getFilename()).isEqualTo("game.zip");
        verify(downloadService, times(1)).downloadPurchase(purchaseId, email, "1.2.3.4", "Mozilla/5.0");
    }

    @Test
    @DisplayName("shouldDownloadPurchase_WhenNoForwardedForHeader")
    void shouldDownloadPurchase_WhenNoForwardedForHeader() {
        // Arrange
        UUID purchaseId = UUID.randomUUID();
        String email = "buyer@godotlaunch.dev";
        ByteArrayInputStream bais = new ByteArrayInputStream("zip-data".getBytes());
        DownloadService.DownloadResource resource = new DownloadService.DownloadResource(bais, "game.zip");

        when(principal.getName()).thenReturn(email);
        when(request.getHeader("X-Forwarded-For")).thenReturn(null);
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        when(request.getHeader(HttpHeaders.USER_AGENT)).thenReturn("Mozilla/5.0");
        when(downloadService.downloadPurchase(purchaseId, email, "127.0.0.1", "Mozilla/5.0")).thenReturn(resource);

        // Act
        ResponseEntity<InputStreamResource> response = downloadController.downloadPurchase(purchaseId, principal, request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(downloadService, times(1)).downloadPurchase(purchaseId, email, "127.0.0.1", "Mozilla/5.0");
    }
}
