package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.CreateAssetRequest;
import com.godotlaunch.backend.dto.request.UpdateAssetRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.AssetResponse;
import com.godotlaunch.backend.entity.enums.ItemStatus;
import com.godotlaunch.backend.service.AssetService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AssetControllerTest {

    @Mock
    private AssetService assetService;

    @Mock
    private Principal principal;

    @InjectMocks
    private AssetController assetController;

    private UUID assetId;
    private String sellerEmail;

    @BeforeEach
    void setUp() {
        assetId = UUID.randomUUID();
        sellerEmail = "seller@godotlaunch.dev";
    }

    @Test
    @DisplayName("shouldCreateAsset_WhenValidRequest")
    void shouldCreateAsset_WhenValidRequest() {
        // Arrange
        CreateAssetRequest request = new CreateAssetRequest();
        request.setTitle("Pixel Art Pack");
        when(principal.getName()).thenReturn(sellerEmail);
        when(assetService.createAsset(any(CreateAssetRequest.class), eq(sellerEmail))).thenReturn(assetId);

        // Act
        ResponseEntity<ApiResponse<Map<String, UUID>>> response = assetController.createAsset(request, principal);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData()).containsEntry("itemId", assetId);
        verify(assetService, times(1)).createAsset(request, sellerEmail);
    }

    @Test
    @DisplayName("shouldGetAllAssets_WhenStatusOrPrincipalProvided")
    void shouldGetAllAssets_WhenStatusOrPrincipalProvided() {
        // Arrange
        AssetResponse assetResp = AssetResponse.builder().id(assetId).title("3D Models").build();
        when(principal.getName()).thenReturn(sellerEmail);
        when(assetService.getAssetsByStatus(ItemStatus.active, sellerEmail)).thenReturn(List.of(assetResp));
        when(assetService.getAllAssets(null)).thenReturn(List.of(assetResp));

        // Act
        ResponseEntity<ApiResponse<List<AssetResponse>>> filtered = assetController.getAllAssets(ItemStatus.active, principal);
        ResponseEntity<ApiResponse<List<AssetResponse>>> all = assetController.getAllAssets(null, null);

        // Assert
        assertThat(filtered.getBody().getData()).hasSize(1);
        assertThat(all.getBody().getData()).hasSize(1);
        verify(assetService, times(1)).getAssetsByStatus(ItemStatus.active, sellerEmail);
        verify(assetService, times(1)).getAllAssets(null);
    }

    @Test
    @DisplayName("shouldGetMyAssets_WhenAuthenticated")
    void shouldGetMyAssets_WhenAuthenticated() {
        // Arrange
        AssetResponse assetResp = AssetResponse.builder().id(assetId).title("My Pack").build();
        when(principal.getName()).thenReturn(sellerEmail);
        when(assetService.getAssetsBySeller(sellerEmail)).thenReturn(List.of(assetResp));

        // Act
        ResponseEntity<ApiResponse<List<AssetResponse>>> response = assetController.getMyAssets(principal);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData()).hasSize(1);
        verify(assetService, times(1)).getAssetsBySeller(sellerEmail);
    }

    @Test
    @DisplayName("shouldGetAssetById_WhenAssetExists")
    void shouldGetAssetById_WhenAssetExists() {
        // Arrange
        AssetResponse assetResp = AssetResponse.builder().id(assetId).title("Audio SFX").build();
        when(assetService.getAssetById(assetId, null)).thenReturn(assetResp);

        // Act
        ResponseEntity<ApiResponse<AssetResponse>> response = assetController.getAssetById(assetId, null);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getTitle()).isEqualTo("Audio SFX");
        verify(assetService, times(1)).getAssetById(assetId, null);
    }

    @Test
    @DisplayName("shouldUpdateAsset_WhenValidRequest")
    void shouldUpdateAsset_WhenValidRequest() {
        // Arrange
        UpdateAssetRequest request = new UpdateAssetRequest();
        request.setTitle("Updated Pack");
        AssetResponse assetResp = AssetResponse.builder().id(assetId).title("Updated Pack").build();

        when(principal.getName()).thenReturn(sellerEmail);
        when(assetService.updateAsset(assetId, request, sellerEmail)).thenReturn(assetResp);

        // Act
        ResponseEntity<ApiResponse<AssetResponse>> response = assetController.updateAsset(assetId, request, principal);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getTitle()).isEqualTo("Updated Pack");
        verify(assetService, times(1)).updateAsset(assetId, request, sellerEmail);
    }

    @Test
    @DisplayName("shouldApproveAsset_WhenCalledByAdmin")
    void shouldApproveAsset_WhenCalledByAdmin() {
        // Arrange
        doNothing().when(assetService).approveAsset(assetId);

        // Act
        ResponseEntity<ApiResponse<Void>> response = assetController.approveAsset(assetId);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(assetService, times(1)).approveAsset(assetId);
    }

    @Test
    @DisplayName("shouldRejectAsset_WhenReasonProvided")
    void shouldRejectAsset_WhenReasonProvided() {
        // Arrange
        doNothing().when(assetService).rejectAsset(assetId, "Low quality asset");

        // Act
        ResponseEntity<ApiResponse<Void>> response = assetController.rejectAsset(assetId, Map.of("reason", "Low quality asset"));

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(assetService, times(1)).rejectAsset(assetId, "Low quality asset");
    }

    @Test
    @DisplayName("shouldDeleteAsset_WhenRemovedBySeller")
    void shouldDeleteAsset_WhenRemovedBySeller() {
        // Arrange
        when(principal.getName()).thenReturn(sellerEmail);
        doNothing().when(assetService).removeAsset(assetId, sellerEmail);

        // Act
        ResponseEntity<ApiResponse<Map<String, String>>> response = assetController.deleteAsset(assetId, principal);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(assetService, times(1)).removeAsset(assetId, sellerEmail);
    }

    @Test
    @DisplayName("shouldUploadItemFile_WhenFileProvided")
    void shouldUploadItemFile_WhenFileProvided() {
        // Arrange
        MockMultipartFile file = new MockMultipartFile("file", "asset.zip", "application/zip", "zip data".getBytes());
        when(principal.getName()).thenReturn(sellerEmail);
        doNothing().when(assetService).uploadItemFile(assetId, file, sellerEmail);

        // Act
        ResponseEntity<ApiResponse<Map<String, String>>> response = assetController.uploadItemFile(assetId, file, principal);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(assetService, times(1)).uploadItemFile(assetId, file, sellerEmail);
    }
}
