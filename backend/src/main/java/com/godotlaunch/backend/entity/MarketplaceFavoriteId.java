package com.godotlaunch.backend.entity;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

public class MarketplaceFavoriteId implements Serializable {

    private UUID user;
    private UUID marketplaceItem;

    public MarketplaceFavoriteId() {}

    public MarketplaceFavoriteId(UUID user, UUID marketplaceItem) {
        this.user = user;
        this.marketplaceItem = marketplaceItem;
    }

    public UUID getUser() {
        return user;
    }

    public void setUser(UUID user) {
        this.user = user;
    }

    public UUID getMarketplaceItem() {
        return marketplaceItem;
    }

    public void setMarketplaceItem(UUID marketplaceItem) {
        this.marketplaceItem = marketplaceItem;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        MarketplaceFavoriteId that = (MarketplaceFavoriteId) o;
        return Objects.equals(user, that.user) && Objects.equals(marketplaceItem, that.marketplaceItem);
    }

    @Override
    public int hashCode() {
        return Objects.hash(user, marketplaceItem);
    }
}
