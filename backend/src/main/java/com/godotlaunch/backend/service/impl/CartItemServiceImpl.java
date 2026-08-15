package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.AddCartItemRequest;
import com.godotlaunch.backend.dto.response.AssetResponse;
import com.godotlaunch.backend.dto.response.GameResponse;
import com.godotlaunch.backend.dto.response.CartItemResponse;
import com.godotlaunch.backend.entity.Asset;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.CartItem;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.Media;
import com.godotlaunch.backend.entity.SourceSnapshot;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.*;
import com.godotlaunch.backend.service.CartItemService;
import com.godotlaunch.backend.service.SeaweedFsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CartItemServiceImpl implements CartItemService {

    private final CartItemRepository cartItemRepository;
    private final UserRepository userRepository;
    private final AssetRepository assetRepository;
    private final GameRepository gameRepository;
    private final MediaRepository mediaRepository;
    private final GameVersionRepository gameVersionRepository;
    private final SourceSnapshotRepository sourceSnapshotRepository;
    private final SeaweedFsService seaweedFsService;

    @Override
    @Transactional
    public List<CartItemResponse> getCart(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        List<CartItem> items = cartItemRepository.findByUserIdOrderByAddedAtDesc(user.getId());
        List<CartItem> invalidOwnItems = items.stream()
                .filter(item -> isOwnedBy(item, user))
                .toList();
        if (!invalidOwnItems.isEmpty()) {
            cartItemRepository.deleteAll(invalidOwnItems);
        }

        return items.stream()
                .filter(item -> !isOwnedBy(item, user))
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public CartItemResponse addToCart(AddCartItemRequest request, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        CartItem cartItem = new CartItem();
        cartItem.setUser(user);

        String type = request.getItemType().toLowerCase();
        if ("asset".equals(type)) {
            Asset asset = assetRepository.findById(request.getItemId())
                    .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));

            if (asset.getSeller().getId().equals(user.getId())) {
                throw new AppException(ErrorCode.OWN_PRODUCT_PURCHASE_NOT_ALLOWED);
            }

            Optional<CartItem> existing = cartItemRepository.findByUserIdAndAssetId(user.getId(), asset.getId());
            if (existing.isPresent()) {
                throw new AppException(ErrorCode.DATA_CONFLICT);
            }

            cartItem.setAsset(asset);
        } else if ("game".equals(type) || "source_code".equals(type)) {
            Game game = gameRepository.findById(request.getItemId())
                    .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));

            if (game.getCreator().getId().equals(user.getId())) {
                throw new AppException(ErrorCode.OWN_PRODUCT_PURCHASE_NOT_ALLOWED);
            }

            Optional<CartItem> existing = cartItemRepository.findByUserIdAndGameId(user.getId(), game.getId());
            if (existing.isPresent()) {
                throw new AppException(ErrorCode.DATA_CONFLICT);
            }

            cartItem.setGame(game);
        } else {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }

        CartItem saved = cartItemRepository.save(cartItem);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public void removeFromCart(UUID itemId, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Optional<CartItem> assetCartItem = cartItemRepository.findByUserIdAndAssetId(user.getId(), itemId);
        if (assetCartItem.isPresent()) {
            cartItemRepository.delete(assetCartItem.get());
            return;
        }

        Optional<CartItem> gameCartItem = cartItemRepository.findByUserIdAndGameId(user.getId(), itemId);
        if (gameCartItem.isPresent()) {
            cartItemRepository.delete(gameCartItem.get());
            return;
        }

        throw new AppException(ErrorCode.BAD_REQUEST);
    }

    @Override
    @Transactional
    public void clearCart(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        List<CartItem> items = cartItemRepository.findByUserIdOrderByAddedAtDesc(user.getId());
        cartItemRepository.deleteAll(items);
    }

    private CartItemResponse mapToResponse(CartItem cartItem) {
        return CartItemResponse.builder()
                .id(cartItem.getId())
                .asset(mapAssetToResponse(cartItem.getAsset()))
                .game(mapGameToResponse(cartItem.getGame()))
                .addedAt(cartItem.getAddedAt() != null ? cartItem.getAddedAt() : Instant.now())
                .build();
    }

    private boolean isOwnedBy(CartItem item, User user) {
        return (item.getAsset() != null && item.getAsset().getSeller().getId().equals(user.getId()))
                || (item.getGame() != null && item.getGame().getCreator().getId().equals(user.getId()));
    }

    private AssetResponse mapAssetToResponse(Asset item) {
        if (item == null) return null;
        var mediaList = mediaRepository.findByAsset_IdOrderByCreatedAtDesc(item.getId());
        String thumbUrl = mediaList.stream().filter(m -> "thumbnail".equals(m.getMediaType()))
                .map(m -> seaweedFsService.resolvePublicUrl(m.getMediaUrl())).findFirst().orElse(null);
        String vidUrl = mediaList.stream().filter(m -> "video".equals(m.getMediaType()))
                .map(m -> seaweedFsService.resolvePublicUrl(m.getMediaUrl())).findFirst().orElse(null);
        java.util.List<String> shots = mediaList.stream().filter(m -> "screenshot".equals(m.getMediaType()))
                .map(m -> seaweedFsService.resolvePublicUrl(m.getMediaUrl())).toList();
        java.util.List<String> assetImgs = mediaList.stream().filter(m -> "asset_image".equals(m.getMediaType()))
                .map(m -> seaweedFsService.resolvePublicUrl(m.getMediaUrl())).toList();

        return AssetResponse.builder()
                .id(item.getId())
                .sellerId(item.getSeller().getId())
                .sellerEmail(item.getSeller().getEmail())
                .sellerFullName(item.getSeller().getFullName())
                .categoryId(item.getCategory() != null ? item.getCategory().getId() : null)
                .categoryName(item.getCategory() != null ? item.getCategory().getName() : null)
                .title(item.getTitle())
                .description(item.getDescription())
                .price(item.getPrice())
                .fileUrl(null)
                .status(item.getStatus())
                .tags(item.getTags() == null ? java.util.List.of() :
                        item.getTags().stream()
                                .map(com.godotlaunch.backend.entity.Tag::getName)
                                .toList())
                .mediaUrls(assetImgs)
                .thumbnailUrl(thumbUrl)
                .videoUrl(vidUrl)
                .screenshots(shots)
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .build();
    }

    private GameResponse mapGameToResponse(Game game) {
        if (game == null) return null;

        List<Media> mediaList = mediaRepository.findByGame_IdOrderByCreatedAtDesc(game.getId());
        List<String> screenshots = mediaList.stream()
                .filter(m -> "image".equalsIgnoreCase(m.getMediaType()) || "screenshot".equalsIgnoreCase(m.getMediaType()))
                .map(m -> seaweedFsService.resolvePublicUrl(m.getMediaUrl()))
                .collect(Collectors.toList());
        String videoUrl = mediaList.stream()
                .filter(m -> "video".equalsIgnoreCase(m.getMediaType()))
                .map(m -> seaweedFsService.resolvePublicUrl(m.getMediaUrl()))
                .findFirst()
                .orElse(null);

        String fileUrl = null;
        List<SourceSnapshot> snaps = sourceSnapshotRepository.findByGameIdOrderByCreatedAtDesc(game.getId());
        if (snaps != null && !snaps.isEmpty()) {
            fileUrl = snaps.get(0).getBundleUrl();
        }

        String versionNumber = "1.0.0";
        var currentVerOpt = gameVersionRepository.findByGame_IdAndIsCurrentTrue(game.getId());
        if (currentVerOpt.isPresent()) {
            versionNumber = currentVerOpt.get().getVersionNumber();
            if (fileUrl == null) {
                fileUrl = currentVerOpt.get().getFileUrl();
            }
        }

        return GameResponse.builder()
                .id(game.getId())
                .title(game.getTitle())
                .description(game.getDescription())
                .thumbnailUrl(seaweedFsService.resolvePublicUrl(game.getThumbnailUrl()))
                .priceProposed(game.getPriceProposed())
                .downloadPrice(null)
                .communityAvailable(game.isSourceListed())
                .status(game.getStatus().name())
                .creatorId(game.getCreator().getId())
                .creatorEmail(game.getCreator().getEmail())
                .creatorName(game.getCreator().getEmail())
                .creatorFullName(game.getCreator().getFullName())
                .categoryName(game.getCategory() != null ? game.getCategory().getName() : null)
                .publishingType(game.getPublishingType() != null ? game.getPublishingType().name() : null)
                .screenshots(screenshots)
                .videoUrl(videoUrl)
                .fileUrl(seaweedFsService.resolvePublicUrl(fileUrl))
                .webDemoUrl(game.getWebDemoUrl())
                .version(versionNumber)
                .tags(game.getTags() == null ? java.util.List.of() : game.getTags().stream().map(com.godotlaunch.backend.utils.TranslationUtils::resolveTagName).toList())
                .githubRepoUrl(game.getGithubRepoUrl())
                .githubBranch(game.getGithubBranch())
                .createdAt(game.getCreatedAt())
                .updatedAt(game.getUpdatedAt())
                .build();
    }
}
