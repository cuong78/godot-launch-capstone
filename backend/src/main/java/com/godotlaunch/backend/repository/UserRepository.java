package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    Optional<User> findByGithubId(String githubId);
    boolean existsByEmail(String email);
    List<User> findByFullNameContainingIgnoreCaseAndStatus(String fullName, String status);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"role"})
    Optional<User> findWithRoleById(UUID id);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"role"})
    Optional<User> findWithRoleByEmail(String email);

    @Query("SELECT u FROM User u WHERE u.avatarUrl IS NOT NULL AND u.avatarUrl <> '' " +
           "AND (:search IS NULL OR :search = '' OR " +
           "LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.avatarUrl) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<User> searchAvatars(@Param("search") String search, Pageable pageable);
}
