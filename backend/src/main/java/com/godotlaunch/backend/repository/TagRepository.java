package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TagRepository extends JpaRepository<Tag, UUID> {
    List<Tag> findAllByOrderByNameAsc();
    List<Tag> findByIdIn(List<UUID> ids);
}
