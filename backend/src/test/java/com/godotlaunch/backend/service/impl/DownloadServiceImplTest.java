package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.entity.Asset;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.Order;
import com.godotlaunch.backend.entity.Role;
import com.godotlaunch.backend.entity.SourceSnapshot;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.OrderRepository;
import com.godotlaunch.backend.repository.SourceSnapshotRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.DownloadService.DownloadResource;
import com.godotlaunch.backend.service.SeaweedFsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DownloadServiceImplTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SourceSnapshotRepository sourceSnapshotRepository;

    @Mock
    private SeaweedFsService seaweedFsService;

    @InjectMocks
    private DownloadServiceImpl downloadService;

    private User buyer;
    private Order assetOrder;
    private Order gameOrder;
    private Asset asset;
    private Game game;
    private UUID purchaseId;

    @BeforeEach
    void setUp() {
        purchaseId = UUID.randomUUID();

        buyer = new User();
        buyer.setId(UUID.randomUUID());
        buyer.setEmail("buyer@example.com");

        Role customerRole = new Role();
        customerRole.setName("customer");
        buyer.setRole(customerRole);

        asset = new Asset();
        asset.setId(UUID.randomUUID());
        asset.setTitle("Asset Title");
        asset.setFileUrl("http://seaweedfs/items/asset.zip");

        game = new Game();
        game.setId(UUID.randomUUID());
        game.setTitle("Game Title");

        assetOrder = new Order();
        assetOrder.setId(purchaseId);
        assetOrder.setBuyer(buyer);
        assetOrder.setAsset(asset);

        gameOrder = new Order();
        gameOrder.setId(purchaseId);
        gameOrder.setBuyer(buyer);
        gameOrder.setGame(game);
    }

    @Test
    @DisplayName("Should successfully download asset purchase")
    void downloadAsset_Success() throws Exception {
        InputStream mockStream = new ByteArrayInputStream("asset-content".getBytes());

        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));
        when(orderRepository.findById(purchaseId)).thenReturn(Optional.of(assetOrder));
        when(seaweedFsService.extractObjectKey(asset.getFileUrl())).thenReturn("items/asset.zip");
        when(seaweedFsService.getObjectStream("items/asset.zip")).thenReturn(mockStream);

        DownloadResource resource = downloadService.downloadPurchase(purchaseId, buyer.getEmail(), "127.0.0.1", "agent");

        assertNotNull(resource);
        assertEquals("asset-title.zip", resource.fileName());
        assertEquals("asset-content", new String(resource.inputStream().readAllBytes()));
    }

    @Test
    @DisplayName("Should successfully download game purchase")
    void downloadGame_Success() throws Exception {
        InputStream mockStream = new ByteArrayInputStream("game-content".getBytes());
        SourceSnapshot snapshot = new SourceSnapshot();
        snapshot.setBundleUrl("http://seaweedfs/games/bundle.zip");

        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));
        when(orderRepository.findById(purchaseId)).thenReturn(Optional.of(gameOrder));
        when(sourceSnapshotRepository.findByGameIdOrderByCreatedAtDesc(game.getId())).thenReturn(Collections.singletonList(snapshot));
        when(seaweedFsService.extractObjectKey(snapshot.getBundleUrl())).thenReturn("games/bundle.zip");
        when(seaweedFsService.getObjectStream("games/bundle.zip")).thenReturn(mockStream);

        DownloadResource resource = downloadService.downloadPurchase(purchaseId, buyer.getEmail(), "127.0.0.1", "agent");

        assertNotNull(resource);
        assertEquals("game-title.zip", resource.fileName());
        assertEquals("game-content", new String(resource.inputStream().readAllBytes()));
    }

    @Test
    @DisplayName("Should throw USER_NOT_FOUND when user does not exist")
    void download_UserNotFound() {
        when(userRepository.findByEmail("stranger@example.com")).thenReturn(Optional.empty());

        AppException exception = assertThrows(AppException.class, () ->
                downloadService.downloadPurchase(purchaseId, "stranger@example.com", "127.0.0.1", "agent")
        );

        assertEquals(ErrorCode.USER_NOT_FOUND, exception.getErrorCode());
    }

    @Test
    @DisplayName("Should throw ACCESS_DENIED when purchase does not exist")
    void download_PurchaseNotFound() {
        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));
        when(orderRepository.findById(purchaseId)).thenReturn(Optional.empty());

        AppException exception = assertThrows(AppException.class, () ->
                downloadService.downloadPurchase(purchaseId, buyer.getEmail(), "127.0.0.1", "agent")
        );

        assertEquals(ErrorCode.ACCESS_DENIED, exception.getErrorCode());
    }

    @Test
    @DisplayName("Should throw ACCESS_DENIED when purchase does not belong to user")
    void download_PurchaseNotBelongingToUser() {
        User otherUser = new User();
        otherUser.setId(UUID.randomUUID());
        otherUser.setEmail("other@example.com");

        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));
        assetOrder.setBuyer(otherUser);
        when(orderRepository.findById(purchaseId)).thenReturn(Optional.of(assetOrder));

        AppException exception = assertThrows(AppException.class, () ->
                downloadService.downloadPurchase(purchaseId, buyer.getEmail(), "127.0.0.1", "agent")
        );

        assertEquals(ErrorCode.ACCESS_DENIED, exception.getErrorCode());
    }

    @Test
    @DisplayName("Should throw FILE_NOT_FOUND when game snapshot is empty")
    void downloadGame_NoSnapshot() {
        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));
        when(orderRepository.findById(purchaseId)).thenReturn(Optional.of(gameOrder));
        when(sourceSnapshotRepository.findByGameIdOrderByCreatedAtDesc(game.getId())).thenReturn(Collections.emptyList());

        AppException exception = assertThrows(AppException.class, () ->
                downloadService.downloadPurchase(purchaseId, buyer.getEmail(), "127.0.0.1", "agent")
        );

        assertEquals(ErrorCode.FILE_NOT_FOUND, exception.getErrorCode());
    }

    @Test
    @DisplayName("Should throw FILE_NOT_FOUND when file url is pending")
    void downloadAsset_FileUrlPending() {
        asset.setFileUrl("pending");
        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));
        when(orderRepository.findById(purchaseId)).thenReturn(Optional.of(assetOrder));

        AppException exception = assertThrows(AppException.class, () ->
                downloadService.downloadPurchase(purchaseId, buyer.getEmail(), "127.0.0.1", "agent")
        );

        assertEquals(ErrorCode.FILE_NOT_FOUND, exception.getErrorCode());
    }

    @Test
    @DisplayName("Should throw ACCESS_DENIED when object key extraction fails")
    void downloadAsset_ObjectKeyExtractionFails() {
        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));
        when(orderRepository.findById(purchaseId)).thenReturn(Optional.of(assetOrder));
        when(seaweedFsService.extractObjectKey(asset.getFileUrl())).thenReturn("");

        AppException exception = assertThrows(AppException.class, () ->
                downloadService.downloadPurchase(purchaseId, buyer.getEmail(), "127.0.0.1", "agent")
        );

        assertEquals(ErrorCode.ACCESS_DENIED, exception.getErrorCode());
    }
}
