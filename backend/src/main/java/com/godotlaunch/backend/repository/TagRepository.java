package com.godotlaunch.backend.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.godotlaunch.backend.entity.Tag;

@Repository
public interface TagRepository extends JpaRepository<Tag, UUID> {
    List<Tag> findAllByOrderByNameAsc();
    List<Tag> findByIdIn(List<UUID> ids);
}
