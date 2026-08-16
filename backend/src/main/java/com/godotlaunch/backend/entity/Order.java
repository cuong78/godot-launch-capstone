package com.godotlaunch.backend.entity;

import com.godotlaunch.backend.entity.enums.OrderType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "buyer_id", nullable = false)
    private User buyer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_id")
    private Asset asset;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_id")
    private Game game;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "order_type", nullable = false, columnDefinition = "order_type_enum")
    private OrderType orderType;

    @Column(name = "price_paid", nullable = false, precision = 15, scale = 2)
    private BigDecimal pricePaid;

    @Column(name = "purchased_at", nullable = false, insertable = false, updatable = false)
    private Instant purchasedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "last_downloaded_game_version_id")
    private GameVersion lastDownloadedGameVersion;

    @Column(name = "last_downloaded_at")
    private Instant lastDownloadedAt;
}
