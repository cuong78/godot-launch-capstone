package com.godotlaunch.backend.entity;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

public class FavoriteId implements Serializable {

    private UUID user;
    private UUID game;

    public FavoriteId() {}

    public FavoriteId(UUID user, UUID game) {
        this.user = user;
        this.game = game;
    }

    public UUID getUser() {
        return user;
    }

    public void setUser(UUID user) {
        this.user = user;
    }

    public UUID getGame() {
        return game;
    }

    public void setGame(UUID game) {
        this.game = game;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        FavoriteId that = (FavoriteId) o;
        return Objects.equals(user, that.user) && Objects.equals(game, that.game);
    }

    @Override
    public int hashCode() {
        return Objects.hash(user, game);
    }
}
