package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.AddCartItemRequest;
import com.godotlaunch.backend.entity.Asset;
import com.godotlaunch.backend.entity.CartItem;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.AssetRepository;
import com.godotlaunch.backend.repository.CartItemRepository;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.GameVersionRepository;
import com.godotlaunch.backend.repository.MediaRepository;
import com.godotlaunch.backend.repository.SourceSnapshotRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.SeaweedFsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CartItemServiceImplTest {

    @Mock private CartItemRepository cartItemRepository;
    @Mock private UserRepository userRepository;
    @Mock private AssetRepository assetRepository;
    @Mock private GameRepository gameRepository;
    @Mock private MediaRepository mediaRepository;
    @Mock private GameVersionRepository gameVersionRepository;
    @Mock private SourceSnapshotRepository sourceSnapshotRepository;
    @Mock private SeaweedFsService seaweedFsService;

    @InjectMocks private CartItemServiceImpl cartItemService;

    private User owner;

    @BeforeEach
    void setUp() {
        owner = new User();
        owner.setId(UUID.randomUUID());
        owner.setEmail("owner@example.com");
    }

    @Test
    void addToCartRejectsGameUploadedByCurrentUser() {
        Game game = new Game();
        game.setId(UUID.randomUUID());
        game.setCreator(owner);

        AddCartItemRequest request = request(game.getId(), "source_code");
        when(userRepository.findByEmail(owner.getEmail())).thenReturn(Optional.of(owner));
        when(gameRepository.findById(game.getId())).thenReturn(Optional.of(game));

        assertThatThrownBy(() -> cartItemService.addToCart(request, owner.getEmail()))
                .isInstanceOf(AppException.class)
                .extracting(error -> ((AppException) error).getErrorCode())
                .isEqualTo(ErrorCode.OWN_PRODUCT_PURCHASE_NOT_ALLOWED);

        verifyNoInteractions(cartItemRepository);
    }

    @Test
    void addToCartRejectsAssetUploadedByCurrentUser() {
        Asset asset = new Asset();
        asset.setId(UUID.randomUUID());
        asset.setSeller(owner);

        AddCartItemRequest request = request(asset.getId(), "asset");
        when(userRepository.findByEmail(owner.getEmail())).thenReturn(Optional.of(owner));
        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));

        assertThatThrownBy(() -> cartItemService.addToCart(request, owner.getEmail()))
                .isInstanceOf(AppException.class)
                .extracting(error -> ((AppException) error).getErrorCode())
                .isEqualTo(ErrorCode.OWN_PRODUCT_PURCHASE_NOT_ALLOWED);

        verifyNoInteractions(cartItemRepository);
    }

    @Test
    void getCartRemovesPreviouslyStoredOwnProducts() {
        Game game = new Game();
        game.setId(UUID.randomUUID());
        game.setCreator(owner);

        CartItem ownGame = new CartItem();
        ownGame.setId(UUID.randomUUID());
        ownGame.setUser(owner);
        ownGame.setGame(game);

        when(userRepository.findByEmail(owner.getEmail())).thenReturn(Optional.of(owner));
        when(cartItemRepository.findByUserIdOrderByAddedAtDesc(owner.getId()))
                .thenReturn(List.of(ownGame));

        assertThat(cartItemService.getCart(owner.getEmail())).isEmpty();
        verify(cartItemRepository).deleteAll(List.of(ownGame));
    }

    private AddCartItemRequest request(UUID itemId, String itemType) {
        AddCartItemRequest request = new AddCartItemRequest();
        request.setItemId(itemId);
        request.setItemType(itemType);
        return request;
    }
}
