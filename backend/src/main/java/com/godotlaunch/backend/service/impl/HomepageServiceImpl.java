package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.dto.response.*;
import com.godotlaunch.backend.entity.*;
import com.godotlaunch.backend.entity.enums.*;
import com.godotlaunch.backend.repository.*;
import com.godotlaunch.backend.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class HomepageServiceImpl implements HomepageService {
    private final HomepageSectionRepository sectionRepository;
    private final GameRepository gameRepository;
    private final AssetRepository assetRepository;
    private final BannerService bannerService;
    private final HomepageCacheService cacheService;

    @Override @Transactional(readOnly = true)
    public HomepageResponse getHomepage() {
        Optional<HomepageResponse> cached = cacheService.get();
        if (cached.isPresent()) return cached.get();

        List<Game> games = gameRepository.findStorefrontGames(GameStatus.published);
        List<Asset> assets = assetRepository.findStorefrontAssets(ItemStatus.active);
        List<HomepageSectionResponse> sections = sectionRepository.findByActiveTrueOrderByDisplayOrderAsc().stream()
                .map(section -> buildSection(section, games, assets)).toList();
        HomepageResponse response = HomepageResponse.builder().banners(bannerService.getAll()).sections(sections).build();
        cacheService.put(response);
        return response;
    }

    @Override public void invalidateCache() { cacheService.evict(); }

    private HomepageSectionResponse buildSection(HomepageSection section, List<Game> games, List<Asset> assets) {
        List<HomepageProductResponse> products;
        if (section.getSectionType() == HomepageSectionType.RECENT_RELEASES) {
            products = Stream.concat(games.stream().map(this::mapGame), assets.stream().map(this::mapAsset))
                    .sorted(Comparator.comparing(HomepageProductResponse::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                    .limit(6).toList();
        } else if (section.getSectionType() == HomepageSectionType.FREE_CONTENT) {
            products = new ArrayList<>(Stream.concat(
                    games.stream().filter(game -> isFree(game.getPriceProposed())).map(this::mapGame),
                    assets.stream().filter(asset -> isFree(asset.getPrice())).map(this::mapAsset)).toList());
            Collections.shuffle(products);
            products = products.stream().limit(6).toList();
        } else {
            products = buildCollection(section.getCollection(), games, assets, section.getItemLimit());
        }
        return HomepageSectionResponse.builder().id(section.getId()).title(section.getTitle()).sectionType(section.getSectionType())
                .collectionId(section.getCollection() == null ? null : section.getCollection().getId())
                .collectionSlug(section.getCollection() == null ? null : section.getCollection().getSlug())
                .displayOrder(section.getDisplayOrder()).itemLimit(section.getItemLimit()).active(section.isActive()).system(section.isSystem())
                .products(products).build();
    }

    private List<HomepageProductResponse> buildCollection(ContentCollection collection, List<Game> games, List<Asset> assets, int sectionLimit) {
        if (collection == null || !collection.isActive()) return List.of();
        Stream<HomepageProductResponse> gameStream = collection.getItemType() == CollectionItemType.ASSET ? Stream.empty()
                : games.stream().filter(game -> matches(game.getCategory(), game.getTags(), collection)).map(this::mapGame);
        Stream<HomepageProductResponse> assetStream = collection.getItemType() == CollectionItemType.GAME ? Stream.empty()
                : assets.stream().filter(asset -> matches(asset.getCategory(), asset.getTags(), collection)).map(this::mapAsset);
        List<HomepageProductResponse> products = new ArrayList<>(Stream.concat(gameStream, assetStream).toList());
        if (collection.getSortMode() == CollectionSortMode.RANDOM) Collections.shuffle(products);
        else if (collection.getSortMode() == CollectionSortMode.POPULAR) products.sort(Comparator.comparing(HomepageProductResponse::getPopularity, Comparator.nullsLast(Comparator.reverseOrder())));
        else products.sort(Comparator.comparing(HomepageProductResponse::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())));
        return products.stream().limit(Math.min(sectionLimit, collection.getMaxItems())).toList();
    }

    private boolean matches(Category category, Set<Tag> itemTags, ContentCollection collection) {
        Set<UUID> categoryIds = collection.getCategories().stream().map(Category::getId).collect(java.util.stream.Collectors.toSet());
        Set<UUID> selectedTagIds = collection.getTags().stream().map(Tag::getId).collect(java.util.stream.Collectors.toSet());
        Set<UUID> itemTagIds = itemTags.stream().map(Tag::getId).collect(java.util.stream.Collectors.toSet());
        boolean categoryMatch = categoryIds.isEmpty() || (category != null && categoryIds.contains(category.getId()));
        boolean tagMatch = selectedTagIds.isEmpty() || (collection.getMatchMode() == CollectionMatchMode.ALL
                ? itemTagIds.containsAll(selectedTagIds) : selectedTagIds.stream().anyMatch(itemTagIds::contains));
        return categoryMatch && tagMatch;
    }

    private boolean isFree(BigDecimal price) { return price == null || price.compareTo(BigDecimal.ZERO) == 0; }
    private HomepageProductResponse mapGame(Game game) {
        return HomepageProductResponse.builder().id(game.getId()).itemType("GAME").title(game.getTitle()).description(game.getDescription())
                .thumbnailUrl(game.getThumbnailUrl()).price(game.getPriceProposed()).creatorName(game.getCreator().getFullName())
                .categoryName(game.getCategory() == null ? null : game.getCategory().getName())
                .tags(game.getTags().stream().map(Tag::getName).sorted().toList()).popularity(game.getDownloadCount()).createdAt(game.getCreatedAt()).build();
    }
    private HomepageProductResponse mapAsset(Asset asset) {
        return HomepageProductResponse.builder().id(asset.getId()).itemType("ASSET").title(asset.getTitle()).description(asset.getDescription())
                .thumbnailUrl(asset.getThumbnailUrl()).price(asset.getPrice()).creatorName(asset.getSeller().getFullName())
                .categoryName(asset.getCategory() == null ? null : asset.getCategory().getName())
                .tags(asset.getTags().stream().map(Tag::getName).sorted().toList()).popularity(0).createdAt(asset.getCreatedAt()).build();
    }
}
