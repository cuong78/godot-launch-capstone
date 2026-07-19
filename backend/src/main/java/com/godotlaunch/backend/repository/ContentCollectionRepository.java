package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.ContentCollection;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface ContentCollectionRepository extends JpaRepository<ContentCollection, UUID> {
    boolean existsBySlug(String slug);
    Optional<ContentCollection> findBySlug(String slug);
    @Override @EntityGraph(attributePaths = {"tags", "categories"})
    List<ContentCollection> findAll();
}
