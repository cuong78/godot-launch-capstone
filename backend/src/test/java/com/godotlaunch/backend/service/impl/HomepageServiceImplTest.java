package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.dto.response.*;
import com.godotlaunch.backend.entity.*;
import com.godotlaunch.backend.entity.enums.*;
import com.godotlaunch.backend.repository.*;
import com.godotlaunch.backend.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HomepageServiceImplTest {

    @Mock
    private HomepageSectionRepository sectionRepository;
    @Mock
    private GameRepository gameRepository;
    @Mock
    private AssetRepository assetRepository;
    @Mock
    private BannerService bannerService;
    @Mock
    private HomepageCacheService cacheService;

    @InjectMocks
    private HomepageServiceImpl homepageService;

    private User creator;
    private Category category;
    private Tag tag;

    @BeforeEach
    void setUp() {
        creator = new User();
        creator.setFullName("John Doe");

        category = new Category();
        category.setId(UUID.randomUUID());
        category.setName("Adventure");

        tag = new Tag();
        tag.setId(UUID.randomUUID());
        tag.setName("2D");
    }

    @Test
    void getHomepage_ShouldReturnCached_WhenCachePresent() {
        HomepageResponse mockCached = HomepageResponse.builder().build();
        when(cacheService.get()).thenReturn(Optional.of(mockCached));

        HomepageResponse response = homepageService.getHomepage();

        assertThat(response).isSameAs(mockCached);
        verifyNoInteractions(sectionRepository, gameRepository, assetRepository, bannerService);
    }

    @Test
    void getHomepage_ShouldBuildAndCache_WhenCacheMiss() {
        when(cacheService.get()).thenReturn(Optional.empty());

        Game game1 = new Game();
        game1.setId(UUID.randomUUID());
        game1.setTitle("Game 1");
        game1.setPriceProposed(BigDecimal.ZERO);
        game1.setCreator(creator);
        game1.setCategory(category);
        game1.setTags(Set.of(tag));
        game1.setDownloadCount(100);
        game1.setCreatedAt(Instant.now());

        Asset asset1 = new Asset();
        asset1.setId(UUID.randomUUID());
        asset1.setTitle("Asset 1");
        asset1.setPrice(BigDecimal.TEN);
        asset1.setSeller(creator);
        asset1.setCategory(category);
        asset1.setTags(Set.of(tag));
        asset1.setCreatedAt(Instant.now());

        when(gameRepository.findStorefrontGames(GameStatus.published)).thenReturn(List.of(game1));
        when(assetRepository.findStorefrontAssets(ItemStatus.active)).thenReturn(List.of(asset1));
        when(bannerService.getAll()).thenReturn(Collections.emptyList());

        // Setup sections
        HomepageSection sectionRecent = new HomepageSection();
        sectionRecent.setId(UUID.randomUUID());
        sectionRecent.setTitle("Recent Releases");
        sectionRecent.setSectionType(HomepageSectionType.RECENT_RELEASES);
        sectionRecent.setDisplayOrder(1);
        sectionRecent.setActive(true);

        HomepageSection sectionFree = new HomepageSection();
        sectionFree.setId(UUID.randomUUID());
        sectionFree.setTitle("Free Content");
        sectionFree.setSectionType(HomepageSectionType.FREE_CONTENT);
        sectionFree.setDisplayOrder(2);
        sectionFree.setActive(true);

        // Custom Collection Section
        ContentCollection collection = new ContentCollection();
        collection.setId(UUID.randomUUID());
        collection.setActive(true);
        collection.setMaxItems(5);
        collection.setCategories(Set.of(category));
        collection.setTags(Set.of(tag));

        HomepageSection sectionCollection = new HomepageSection();
        sectionCollection.setId(UUID.randomUUID());
        sectionCollection.setTitle("Custom Collection");
        sectionCollection.setSectionType(HomepageSectionType.COLLECTION);
        sectionCollection.setDisplayOrder(3);
        sectionCollection.setActive(true);
        sectionCollection.setCollection(collection);

        when(sectionRepository.findByActiveTrueOrderByDisplayOrderAsc())
                .thenReturn(List.of(sectionRecent, sectionFree, sectionCollection));

        HomepageResponse response = homepageService.getHomepage();

        assertThat(response).isNotNull();
        assertThat(response.getSections()).hasSize(3);
        verify(cacheService, times(1)).put(any(HomepageResponse.class));
    }

    @Test
    void invalidateCache_ShouldEvictCache() {
        homepageService.invalidateCache();
        verify(cacheService, times(1)).evict();
    }
}
