//package com.godotlaunch.backend.service.impl;
//
//import com.godotlaunch.backend.dto.request.PublishingGuideRequest;
//import com.godotlaunch.backend.dto.response.PublishingGuideResponse;
//import com.godotlaunch.backend.entity.PublishingGuide;
//import com.godotlaunch.backend.entity.User;
//import com.godotlaunch.backend.exception.AppException;
//import com.godotlaunch.backend.constant.ErrorCode;
//import com.godotlaunch.backend.service.PublishingGuideService;
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
//public class PublishingGuideServiceImpl implements PublishingGuideService {
//
//    private final PublishingGuideRepository publishingGuideRepository;
//    private final UserRepository userRepository;
//
//    @Override
//    public List<PublishingGuideResponse> getAllGuides() {
//        return publishingGuideRepository.findAllByOrderByStepOrderAsc().stream()
//                .map(this::mapToResponse)
//                .collect(Collectors.toList());
//    }
//
//    @Override
//    public List<PublishingGuideResponse> getActiveGuides() {
//        return publishingGuideRepository.findByIsActiveTrueOrderByStepOrderAsc().stream()
//                .map(this::mapToResponse)
//                .collect(Collectors.toList());
//    }
//
//    @Override
//    public PublishingGuideResponse getGuideById(UUID id) {
//        PublishingGuide guide = publishingGuideRepository.findById(id)
//                .orElseThrow(() -> new AppException(ErrorCode.GUIDE_NOT_FOUND));
//        return mapToResponse(guide);
//    }
//
//    @Override
//    @Transactional
//    public PublishingGuideResponse createGuide(PublishingGuideRequest request, String email) {
//        if (publishingGuideRepository.existsByStepOrder(request.getStepOrder())) {
//            throw new AppException(ErrorCode.DUPLICATE_STEP_ORDER);
//        }
//
//        User adminUser = userRepository.findByEmail(email)
//                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
//
//        PublishingGuide guide = new PublishingGuide();
//        guide.setStepOrder(request.getStepOrder());
//        guide.setTitle(request.getTitle());
//        guide.setDescription(request.getDescription());
//        guide.setTip(request.getTip());
//        guide.setVideoUrl(request.getVideoUrl());
//        guide.setActive(request.isActive());
//        guide.setCreatedBy(adminUser);
//
//        PublishingGuide savedGuide = publishingGuideRepository.save(guide);
//        return mapToResponse(savedGuide);
//    }
//
//    @Override
//    @Transactional
//    public PublishingGuideResponse updateGuide(UUID id, PublishingGuideRequest request) {
//        PublishingGuide guide = publishingGuideRepository.findById(id)
//                .orElseThrow(() -> new AppException(ErrorCode.GUIDE_NOT_FOUND));
//
//        if (!guide.getStepOrder().equals(request.getStepOrder()) &&
//            publishingGuideRepository.existsByStepOrder(request.getStepOrder())) {
//            throw new AppException(ErrorCode.DUPLICATE_STEP_ORDER);
//        }
//
//        guide.setStepOrder(request.getStepOrder());
//        guide.setTitle(request.getTitle());
//        guide.setDescription(request.getDescription());
//        guide.setTip(request.getTip());
//        guide.setVideoUrl(request.getVideoUrl());
//        guide.setActive(request.isActive());
//
//        PublishingGuide updatedGuide = publishingGuideRepository.save(guide);
//        return mapToResponse(updatedGuide);
//    }
//
//    @Override
//    @Transactional
//    public void deleteGuide(UUID id) {
//        if (!publishingGuideRepository.existsById(id)) {
//            throw new AppException(ErrorCode.GUIDE_NOT_FOUND);
//        }
//        publishingGuideRepository.deleteById(id);
//    }
//
//    private PublishingGuideResponse mapToResponse(PublishingGuide guide) {
//        return PublishingGuideResponse.builder()
//                .id(guide.getId())
//                .stepOrder(guide.getStepOrder())
//                .title(guide.getTitle())
//                .description(guide.getDescription())
//                .tip(guide.getTip())
//                .videoUrl(guide.getVideoUrl())
//                .isActive(guide.isActive())
//                .createdByUsername(guide.getCreatedBy() != null ? guide.getCreatedBy().getEmail() : null)
//                .createdAt(guide.getCreatedAt())
//                .updatedAt(guide.getUpdatedAt())
//                .build();
//    }
//}
