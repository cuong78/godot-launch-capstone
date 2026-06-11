package com.godotlaunch.backend;

import com.godotlaunch.backend.repository.ContractRepository;
import com.godotlaunch.backend.repository.GameRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class BackendApplicationTests {

    @Autowired
    private ContractRepository contractRepository;

    @Autowired
    private GameRepository gameRepository;

    @Test
    void contextLoads() {
        System.out.println("=== CONTRACTS ===");
        contractRepository.findAll().forEach(contract -> {
            try {
                System.out.println("Contract ID: " + contract.getId() 
                    + ", Game: " + (contract.getGame() != null ? contract.getGame().getTitle() : "null")
                    + ", Seller: " + (contract.getSeller() != null ? contract.getSeller().getEmail() : "null")
                    + ", Buyer: " + (contract.getBuyer() != null ? contract.getBuyer().getEmail() : "null")
                );
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
        System.out.println("=== GAMES ===");
        gameRepository.findAll().forEach(game -> {
            try {
                System.out.println("Game ID: " + game.getId()
                    + ", Title: " + game.getTitle()
                    + ", Creator: " + (game.getCreator() != null ? game.getCreator().getEmail() : "null")
                );
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
    }

}
