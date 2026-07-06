package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.entity.Asset;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.Order;
import com.godotlaunch.backend.entity.Transaction;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.Wallet;
import com.godotlaunch.backend.entity.enums.ItemStatus;
import com.godotlaunch.backend.entity.enums.GameStatus;
import com.godotlaunch.backend.entity.enums.OrderType;
import com.godotlaunch.backend.entity.enums.TxnType;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.AssetRepository;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.OrderRepository;
import com.godotlaunch.backend.repository.TransactionRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.repository.WalletRepository;
import com.godotlaunch.backend.entity.Payment;
import com.godotlaunch.backend.entity.enums.PaymentStatus;
import com.godotlaunch.backend.repository.PaymentRepository;
import com.godotlaunch.backend.service.OrderService;
import com.godotlaunch.backend.service.PlatformSettingsService;
import com.godotlaunch.backend.service.WalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final AssetRepository assetRepository;
    private final GameRepository gameRepository;
    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final WalletService walletService;
    private final PlatformSettingsService platformSettingsService;
    private final PaymentRepository paymentRepository;

    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");

    @Override
    @Transactional
    public Order buy(String buyerEmail, UUID targetId, OrderType orderType) {
        // 1. Fetch buyer
        User buyer = userRepository.findByEmail(buyerEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        BigDecimal price = BigDecimal.ZERO;
        Asset asset = null;
        Game game = null;
        User seller = null;

        // 2. Fetch target item and validate status
        if (orderType == OrderType.asset_purchase) {
            asset = assetRepository.findById(targetId)
                    .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));
            if (asset.getStatus() != ItemStatus.active) {
                throw new AppException(ErrorCode.BAD_REQUEST);
            }
            price = asset.getPrice();
            seller = asset.getSeller();
        } else if (orderType == OrderType.source_code_purchase) {
            game = gameRepository.findById(targetId)
                    .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));
            if (game.getStatus() != GameStatus.published) {
                throw new AppException(ErrorCode.BAD_REQUEST);
            }
            price = game.getPriceProposed();
            seller = game.getCreator();
        } else {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }

        if (price == null) {
            price = BigDecimal.ZERO;
        }

        // 3. Validation checks
        if (seller.getId().equals(buyer.getId())) {
            throw new AppException(ErrorCode.OWN_PRODUCT_PURCHASE_NOT_ALLOWED);
        }

        if (orderType == OrderType.asset_purchase) {
            if (orderRepository.existsByBuyerIdAndAssetId(buyer.getId(), asset.getId())) {
                throw new AppException(ErrorCode.BAD_REQUEST);
            }
        } else {
            if (orderRepository.existsByBuyerIdAndGameId(buyer.getId(), game.getId())) {
                throw new AppException(ErrorCode.BAD_REQUEST);
            }
        }

        // Fetch platform wallet (represented by the first admin user found)
        User platformAdmin = userRepository.findByEmail("admin@godotlaunch.com")
                .orElseGet(() -> userRepository.findAll().stream()
                        .filter(u -> "admin".equalsIgnoreCase(u.getRole().getName()))
                        .findFirst()
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND)));

        // 4. Fetch wallets with Pessimistic Write Lock to prevent double-spending & race conditions
        Wallet buyerWallet = getOrCreateWalletWithLock(buyer);
        Wallet sellerWallet = getOrCreateWalletWithLock(seller);
        Wallet platformWallet = getOrCreateWalletWithLock(platformAdmin);

        // 5. Check balance
        if (buyerWallet.getBalance().compareTo(price) < 0) {
            throw new AppException(ErrorCode.INSUFFICIENT_BALANCE);
        }

        // 6. Deduct buyer wallet
        buyerWallet.setBalance(buyerWallet.getBalance().subtract(price));
        walletRepository.save(buyerWallet);

        // 7. Calculate commission and seller revenue
        BigDecimal platformCommission = price
                .multiply(platformSettingsService.getPlatformCommissionRate())
                .divide(ONE_HUNDRED, 2, RoundingMode.HALF_UP);
        BigDecimal sellerRevenue = price.subtract(platformCommission);

        // 8. Add seller revenue to seller's wallet
        sellerWallet.setBalance(sellerWallet.getBalance().add(sellerRevenue));
        walletRepository.save(sellerWallet);

        // 9. Add platform commission to platform's wallet
        platformWallet.setBalance(platformWallet.getBalance().add(platformCommission));
        walletRepository.save(platformWallet);

        // 10. Create and save Order
        Order order = new Order();
        order.setBuyer(buyer);
        order.setAsset(asset);
        order.setGame(game);
        order.setOrderType(orderType);
        order.setPricePaid(price);
        order = orderRepository.save(order);

        String refId = "WALLET_BUY:" + order.getId();

        // Create and save Payment in PAID status
        Payment payment = new Payment();
        payment.setWallet(buyerWallet);
        payment.setPaymentStatus(PaymentStatus.PAID);
        payment.setAmount(price);
        payment.setCurrency("VND");
        payment.setPaymentReference((orderType == OrderType.asset_purchase ? "BUY_ASSET:" : "BUY_GAME:") + targetId);
        payment.setPaidAt(java.time.Instant.now());
        payment.setCheckoutUrl(null);
        payment = paymentRepository.save(payment);

        // 11. Record 3 transactions (double-entry bookkeeping)
        // Transaction 1: Buyer debit
        Transaction txnBuyer = new Transaction();
        txnBuyer.setWallet(buyerWallet);
        txnBuyer.setRelatedUser(seller);
        txnBuyer.setGame(game);
        txnBuyer.setAsset(asset);
        txnBuyer.setAmount(price.negate());
        txnBuyer.setType(orderType == OrderType.asset_purchase ? TxnType.asset_purchase : TxnType.source_code_purchase);
        txnBuyer.setReferenceId(refId);
        txnBuyer.setOrder(order);
        txnBuyer.setPayment(payment);
        txnBuyer.setDescription("Debit buyer wallet for " + (orderType == OrderType.asset_purchase ? "asset" : "game source") + " purchase");
        transactionRepository.save(txnBuyer);

        // Transaction 2: Seller credit
        Transaction txnSeller = new Transaction();
        txnSeller.setWallet(sellerWallet);
        txnSeller.setRelatedUser(buyer);
        txnSeller.setGame(game);
        txnSeller.setAsset(asset);
        txnSeller.setAmount(sellerRevenue);
        txnSeller.setType(TxnType.revenue_share);
        txnSeller.setReferenceId(refId);
        txnSeller.setOrder(order);
        txnSeller.setDescription("Credit seller wallet with revenue share");
        transactionRepository.save(txnSeller);

        // Transaction 3: Platform commission credit
        Transaction txnPlatform = new Transaction();
        txnPlatform.setWallet(platformWallet);
        txnPlatform.setRelatedUser(buyer);
        txnPlatform.setGame(game);
        txnPlatform.setAsset(asset);
        txnPlatform.setAmount(platformCommission);
        txnPlatform.setType(TxnType.commission);
        txnPlatform.setReferenceId(refId);
        txnPlatform.setOrder(order);
        txnPlatform.setDescription("Credit platform wallet with commission fee");
        transactionRepository.save(txnPlatform);

        log.info("Direct wallet purchase completed: orderId={}, buyer={}, price={}, sellerRevenue={}, commission={}",
                order.getId(), buyerEmail, price, sellerRevenue, platformCommission);

        return order;
    }

    private Wallet getOrCreateWalletWithLock(User user) {
        return walletRepository.findByUserIdWithLock(user.getId())
                .orElseGet(() -> {
                    // Create wallet if not present, then fetch it with lock
                    walletService.getOrCreateWallet(user);
                    return walletRepository.findByUserIdWithLock(user.getId())
                            .orElseThrow(() -> new AppException(ErrorCode.WALLET_NOT_FOUND));
                });
    }
}
