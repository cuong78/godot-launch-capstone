package com.godotlaunch.backend.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import com.godotlaunch.backend.entity.Order;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {
    boolean existsByBuyerIdAndAssetId(UUID buyerId, UUID assetId);
    Optional<Order> findByBuyerIdAndAssetId(UUID buyerId, UUID assetId);

    boolean existsByBuyerIdAndGameId(UUID buyerId, UUID gameId);
    Optional<Order> findByBuyerIdAndGameId(UUID buyerId, UUID gameId);

    java.util.List<Order> findByGameIdAndPurchasedAtAfter(UUID gameId, java.time.Instant purchasedAt);

    @Query(value = "SELECT DISTINCT o.buyer.id AS userId, o.buyer.email AS email, " +
            "o.buyer.preferredLanguage AS preferredLanguage " +
            "FROM Order o WHERE o.game.id = :gameId " +
            "AND o.purchasedAt < :releasedAt " +
            "AND o.buyer.id <> :creatorId " +
            "ORDER BY o.buyer.id",
            countQuery = "SELECT COUNT(DISTINCT o.buyer.id) FROM Order o " +
                    "WHERE o.game.id = :gameId " +
                    "AND o.purchasedAt < :releasedAt " +
                    "AND o.buyer.id <> :creatorId")
    Page<BuyerNotificationTarget> findReleaseRecipients(
            @Param("gameId") UUID gameId,
            @Param("releasedAt") java.time.Instant releasedAt,
            @Param("creatorId") UUID creatorId,
            Pageable pageable
    );

    interface BuyerNotificationTarget {
        UUID getUserId();
        String getEmail();
        String getPreferredLanguage();
    }
}
