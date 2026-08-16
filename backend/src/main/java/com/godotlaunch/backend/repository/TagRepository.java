package com.godotlaunch.backend.repository;

import java.util.List;
import java.util.UUID;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.godotlaunch.backend.entity.Tag;

@Repository
public interface TagRepository extends JpaRepository<Tag, UUID> {
    List<Tag> findAllByOrderByNameAsc();
    List<Tag> findByIdIn(List<UUID> ids);
    List<Tag> findByNameIn(List<String> names);
    boolean existsByName(String name);
    boolean existsBySlug(String slug);
    Optional<Tag> findByName(String name);
    Optional<Tag> findBySlug(String slug);

    @Query("""
            SELECT tag
            FROM Tag tag
            WHERE :query = ''
               OR LOWER(tag.name) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(tag.slug) LIKE LOWER(CONCAT('%', :query, '%'))
            ORDER BY CASE
                WHEN LOWER(tag.name) = LOWER(:query) THEN 0
                WHEN LOWER(tag.name) LIKE LOWER(CONCAT(:query, '%')) THEN 1
                ELSE 2
            END,
            tag.name ASC
            """)
    List<Tag> search(@Param("query") String query, Pageable pageable);
}
