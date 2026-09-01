package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.dto.request.ContractRequest;
import com.godotlaunch.backend.dto.response.ContractResponse;
import com.godotlaunch.backend.entity.Contract;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.enums.ContractStatus;
import com.godotlaunch.backend.entity.enums.ContractType;
import com.godotlaunch.backend.entity.enums.NotificationType;
import com.godotlaunch.backend.repository.ContractRepository;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.AuditLogService;
import com.godotlaunch.backend.service.EmailService;
import com.godotlaunch.backend.service.NotificationService;
import com.godotlaunch.backend.service.SeaweedFsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ContractServiceImplTest {

    @Mock
    private ContractRepository contractRepository;

    @Mock
    private GameRepository gameRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SeaweedFsService seaweedFsService;

    @Mock
    private EmailService emailService;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private ContractServiceImpl contractService;

    private User admin;
    private User developer;
    private Game game;
    private Contract contract;
    private UUID contractId;

    @BeforeEach
    void setUp() {
        admin = new User();
        admin.setId(UUID.randomUUID());
        admin.setEmail("admin@godotlaunch.dev");

        developer = new User();
        developer.setId(UUID.randomUUID());
        developer.setEmail("dev@godotlaunch.dev");

        game = new Game();
        game.setId(UUID.randomUUID());
        game.setTitle("Indie RPG");
        game.setCreator(developer);

        contractId = UUID.randomUUID();
        contract = new Contract();
        contract.setId(contractId);
        contract.setGame(game);
        contract.setSeller(developer);
        contract.setStatus(ContractStatus.pending);
        contract.setSellerRepresentative("Dev Rep");
        contract.setSellerAddress("123 Street");
    }

    @Test
    @DisplayName("shouldCreateOffer_WhenAdminRequest")
    void shouldCreateOffer_WhenAdminRequest() {
        // Arrange
        ContractRequest request = new ContractRequest();
        request.setGameId(game.getId());
        request.setContractType(ContractType.co_publishing);
        request.setPriceProposed(new java.math.BigDecimal("50000"));
        request.setSellerRepresentative("Dev Rep");
        request.setSellerAddress("123 Street");
        request.setSellerTaxCode("12345");
        request.setBuyerSignatureBase64("sig-base-64");

        when(gameRepository.findById(game.getId())).thenReturn(Optional.of(game));
        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        when(contractRepository.save(any(Contract.class))).thenAnswer(i -> {
            Contract c = i.getArgument(0);
            c.setId(contractId);
            return c;
        });

        // Act
        ContractResponse response = contractService.createOffer(request, admin.getId());

        // Assert
        assertThat(response.getId()).isEqualTo(contractId);
        assertThat(response.getContractType()).isEqualTo(ContractType.co_publishing);
        verify(contractRepository, times(1)).save(any(Contract.class));
        verify(gameRepository, times(1)).save(game);
        assertThat(game.getPriceProposed()).isEqualTo(new java.math.BigDecimal("50000"));
    }

    @Test
    @DisplayName("shouldGetContractsByDeveloper_WhenDeveloperExists")
    void shouldGetContractsByDeveloper_WhenDeveloperExists() {
        when(contractRepository.findBySellerId(developer.getId())).thenReturn(List.of(contract));

        List<ContractResponse> responses = contractService.getContractsByDeveloper(developer.getId());

        assertThat(responses).hasSize(1);
    }

    @Test
    @DisplayName("shouldGetAllContracts_WhenRequested")
    void shouldGetAllContracts_WhenRequested() {
        when(contractRepository.findAll()).thenReturn(List.of(contract));

        List<ContractResponse> responses = contractService.getAllContracts();

        assertThat(responses).hasSize(1);
    }

    @Test
    @DisplayName("shouldGetContractById_WhenExists")
    void shouldGetContractById_WhenExists() {
        when(contractRepository.findById(contractId)).thenReturn(Optional.of(contract));

        ContractResponse response = contractService.getContractById(contractId);

        assertThat(response.getId()).isEqualTo(contractId);
    }

    @Test
    @DisplayName("shouldThrowException_WhenContractNotFound")
    void shouldThrowException_WhenContractNotFound() {
        when(contractRepository.findById(contractId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> contractService.getContractById(contractId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Contract not found");
    }

    @Test
    @DisplayName("shouldSignByDeveloper_WhenValidDetails")
    void shouldSignByDeveloper_WhenValidDetails() {
        when(contractRepository.findById(contractId)).thenReturn(Optional.of(contract));

        ContractResponse response = contractService.signByDeveloper(
                contractId, developer.getId(), "sig-data", "Rep Name", "456 Avenue", "67890"
        );

        assertThat(response.getStatus()).isEqualTo(ContractStatus.signed);
        verify(contractRepository, times(1)).save(contract);
    }

    @Test
    @DisplayName("shouldThrowException_WhenSignerNotSeller")
    void shouldThrowException_WhenSignerNotSeller() {
        when(contractRepository.findById(contractId)).thenReturn(Optional.of(contract));

        assertThatThrownBy(() -> contractService.signByDeveloper(
                contractId, UUID.randomUUID(), "sig-data", "Rep Name", "456 Avenue", "67890"
        )).isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Unauthorized to sign this contract");
    }

    @Test
    @DisplayName("shouldRejectByDeveloper_WhenReasonProvided")
    void shouldRejectByDeveloper_WhenReasonProvided() {
        when(contractRepository.findById(contractId)).thenReturn(Optional.of(contract));

        ContractResponse response = contractService.rejectByDeveloper(
                contractId, developer.getId(), "Price is too low"
        );

        assertThat(response.getStatus()).isEqualTo(ContractStatus.cancelled);
        verify(contractRepository, times(1)).save(contract);
    }
}
