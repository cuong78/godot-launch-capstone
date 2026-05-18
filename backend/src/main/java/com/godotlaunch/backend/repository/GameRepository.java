package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.enums.GameStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GameRepository extends JpaRepository<Game, UUID> {
    List<Game> findByCreatorId(UUID creatorId);
    List<Game> findByStatus(GameStatus status);
    List<Game> findByCategoryId(UUID categoryId);
}
