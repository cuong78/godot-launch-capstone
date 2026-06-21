package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.StorageBucket;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StorageBucketRepository extends JpaRepository<StorageBucket, UUID> {

    @EntityGraph(attributePaths = {"account"})
    List<StorageBucket> findAll();

    @EntityGraph(attributePaths = {"account"})
    Optional<StorageBucket> findById(UUID id);

    @EntityGraph(attributePaths = {"account"})
    List<StorageBucket> findAllByAccountId(UUID accountId);
}
