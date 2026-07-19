package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.HomepageSection;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface HomepageSectionRepository extends JpaRepository<HomepageSection, UUID> {
    @EntityGraph(attributePaths = {"collection", "collection.tags", "collection.categories"})
    List<HomepageSection> findAllByOrderByDisplayOrderAsc();
    @EntityGraph(attributePaths = {"collection", "collection.tags", "collection.categories"})
    List<HomepageSection> findByActiveTrueOrderByDisplayOrderAsc();
}
