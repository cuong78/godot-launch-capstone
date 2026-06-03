//package com.godotlaunch.backend.service.impl;
//
//import com.godotlaunch.backend.constant.ErrorCode;
//import com.godotlaunch.backend.dto.response.GameResponse;
//import com.godotlaunch.backend.entity.Favorite;
//import com.godotlaunch.backend.entity.FavoriteId;
//import com.godotlaunch.backend.entity.Game;
//import com.godotlaunch.backend.entity.User;
//import com.godotlaunch.backend.exception.AppException;
//import com.godotlaunch.backend.service.WishlistService;
//import lombok.RequiredArgsConstructor;
//import org.springframework.stereotype.Service;
//import org.springframework.transaction.annotation.Transactional;
//
//import java.util.List;
//import java.util.UUID;
//import java.util.stream.Collectors;
//
//@Service
//@RequiredArgsConstructor
//public class WishlistServiceImpl implements WishlistService {
//
//    private final FavoriteRepository favoriteRepository;
//    private final UserRepository userRepository;
//    private final GameRepository gameRepository;
//
//    @Override
//    @Transactional
//    public void addGameToWishlist(String userEmail, UUID gameId) {
//        User user = userRepository.findByEmail(userEmail)
//                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
//
//        Game game = gameRepository.findById(gameId)
//                .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));
//
//        if (favoriteRepository.existsByUserIdAndGameId(user.getId(), gameId)) {
//            throw new AppException(ErrorCode.WISHLIST_ALREADY_EXISTS);
//        }
//
//        Favorite favorite = new Favorite();
//        favorite.setUser(user);
//        favorite.setGame(game);
//
//        favoriteRepository.save(favorite);
//    }
//
//    @Override
//    @Transactional
//    public void removeGameFromWishlist(String userEmail, UUID gameId) {
//        User user = userRepository.findByEmail(userEmail)
//                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
//
//        if (!favoriteRepository.existsByUserIdAndGameId(user.getId(), gameId)) {
//            throw new AppException(ErrorCode.WISHLIST_ITEM_NOT_FOUND);
//        }
//
//        favoriteRepository.deleteById(new FavoriteId(user.getId(), gameId));
//    }
//
//    @Override
//    @Transactional(readOnly = true)
//    public List<GameResponse> getWishlist(String userEmail) {
//        User user = userRepository.findByEmail(userEmail)
//                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
//
//        List<Favorite> favorites = favoriteRepository.findByUserId(user.getId());
//
//        return favorites.stream()
//                .map(favorite -> mapToGameResponse(favorite.getGame()))
//                .collect(Collectors.toList());
//    }
//
//    @Override
//    @Transactional(readOnly = true)
//    public boolean isGameWishlisted(String userEmail, UUID gameId) {
//        User user = userRepository.findByEmail(userEmail)
//                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
//
//        return favoriteRepository.existsByUserIdAndGameId(user.getId(), gameId);
//    }
//
//    private GameResponse mapToGameResponse(Game game) {
//        return GameResponse.builder()
//                .id(game.getId())
//                .title(game.getTitle())
//                .description(game.getDescription())
//                .thumbnailUrl(game.getThumbnailUrl())
//                .downloadPrice(null)
//                .communityAvailable(game.isSourceListed())
//                .status(game.getStatus() != null ? game.getStatus().name() : null)
//                .creatorName(game.getCreator() != null ? game.getCreator().getFullName() : null)
//                .categoryName(game.getCategory() != null ? game.getCategory().getName() : null)
//                .build();
//    }
//}
