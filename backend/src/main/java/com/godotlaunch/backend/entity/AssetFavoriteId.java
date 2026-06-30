package com.godotlaunch.backend.entity;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

public class AssetFavoriteId implements Serializable {

    private UUID user;
    private UUID asset;

    public AssetFavoriteId() {}

    public AssetFavoriteId(UUID user, UUID asset) {
        this.user = user;
        this.asset = asset;
    }

    public UUID getUser() {
        return user;
    }

    public void setUser(UUID user) {
        this.user = user;
    }

    public UUID getAsset() {
        return asset;
    }

    public void setAsset(UUID asset) {
        this.asset = asset;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        AssetFavoriteId that = (AssetFavoriteId) o;
        return Objects.equals(user, that.user) && Objects.equals(asset, that.asset);
    }

    @Override
    public int hashCode() {
        return Objects.hash(user, asset);
    }
}
