import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { Header } from './components/Header';
import { AdminHeader } from './components/admin/AdminHeader';
import { Footer } from './components/Footer';
import {
  Asset,
  Project,
  User,
  ScreenType,
  CommunityChatResponse,
  UserSummary,
  ReactionType,
  MarketplaceItemResponse,
  PaymentResponse,
  CategoryResponse,
} from './types';
import { Button } from './components/Button';

// Modular Page Components
import { HomePage } from './page/HomePage';
import { MarketplacePage } from './page/MarketplacePage';
import { DetailPage } from './page/DetailPage';
import { UploadPage } from './page/UploadPage';
import { PathPage } from './page/PathPage';
import { DashboardPage } from './page/DashboardPage';
import { WalletPage } from './page/WalletPage';
import { SignInPage } from './page/SignInPage';
import { SignUpPage } from './page/SignUpPage';
import { AdminPage } from './page/AdminPage';
import { GitHubCallbackPage } from './page/GitHubCallbackPage';
import { ProfilePage } from './page/ProfilePage';
import { ProfileScreen } from './page/ProfileScreen';
import { CheckoutPage } from './page/CheckoutPage';
import { PaymentDetailPage } from './page/PaymentDetailPage';
import { PaymentResultPage } from './page/PaymentResultPage';
import { PaymentQrPage } from './page/PaymentQrPage';
import { DeveloperOnboardingPage } from './page/DeveloperOnboardingPage';
import { ConfirmResumeCheckoutModal } from './components/ConfirmResumeCheckoutModal';
import { AiChatWidget } from './components/AiChatWidget';

import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import { useToast } from './hooks/useToast';
import { useWebSocket } from './context/WebSocketContext';
import { gameApi } from './api/gameApi';
import { marketplaceApi } from './api/marketplaceApi';
import { paymentApi } from './api/paymentApi';
import { orderApi } from './api/orderApi';
import { cartApi } from './api/cartApi';
import { dispatchAdminNavigation } from './utils/adminNavigation';
import {
  PendingCheckoutContext,
  clearPaymentQrSession,
  clearPendingCheckoutContext,
  readPaymentQrSession,
  readPendingCheckoutContext,
  storePaymentQrSession,
  storePendingCheckoutContext,
  updatePendingCheckoutContext,
} from './utils/paymentFlowStorage';

// Seed Images loaded from assets folder management
import { VOXEL_BG_IMAGE, IMAGE_SEED_MAP } from '../assets/images';

const DEFAULT_AUTHOR_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80';
const PAYMENT_SESSION_STORAGE_KEY = 'godotlaunch-payment-orders';
const PAYMENT_SELECTED_ORDER_STORAGE_KEY = 'godotlaunch-selected-payment-order';
const THEME_STORAGE_KEY = 'godotlaunch-theme';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

const readStoredPayments = (): PaymentResponse[] => {
  try {
    const raw = sessionStorage.getItem(PAYMENT_SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn('Failed to read stored payments from sessionStorage:', error);
    return [];
  }
};

const readStoredSelectedPaymentOrder = () => {
  try {
    return sessionStorage.getItem(PAYMENT_SELECTED_ORDER_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to read selected payment order from sessionStorage:', error);
    return null;
  }
};

const formatMarketplaceDate = (date: string | undefined, t: TranslateFn) => {
  if (!date) {
    return t('app.marketplace.recentlyListed');
  }

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return t('app.marketplace.recentlyListed');
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  }).format(parsedDate);
};

const hashString = (value: string) =>
  Array.from(value).reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);

const MARKETPLACE_IMAGE_POOL = [
  IMAGE_SEED_MAP.interior,
  IMAGE_SEED_MAP.sky,
  IMAGE_SEED_MAP.forest,
  IMAGE_SEED_MAP.knight,
  IMAGE_SEED_MAP.char,
  IMAGE_SEED_MAP.planner,
  IMAGE_SEED_MAP.tycoon,
];

const getMarketplaceImage = (item: MarketplaceItemResponse) =>
  MARKETPLACE_IMAGE_POOL[Math.abs(hashString(item.id)) % MARKETPLACE_IMAGE_POOL.length];

const buildMarketplaceTagList = (
  item: MarketplaceItemResponse,
  category: Asset['category'],
  t: TranslateFn
) => [
  t('app.marketplace.assetPack'),
  category,
  item.version,
  item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : undefined
].filter((tag): tag is string => Boolean(tag));

const mapMarketplaceItemToAsset = (item: MarketplaceItemResponse, t: TranslateFn): Asset => {
  const category = item.categoryName?.trim() || t('app.marketplace.uncategorized');
  const dbTags = item.tags || [];
  const tagList = dbTags.length > 0 ? dbTags : buildMarketplaceTagList(item, category, t);

  return {
    id: item.id,
    sellerEmail: item.sellerEmail,
    title: item.title,
    price: Number(item.price || 0),
    rating: 4.8,
    reviewedCount: 0,
    author: item.sellerFullName || item.sellerEmail || t('app.marketplace.unknownCreator'),
    authorAvatar: DEFAULT_AUTHOR_AVATAR,
    category,
    description: item.description || '',
    image: item.thumbnailUrl || (item.screenshots && item.screenshots.length > 0 ? item.screenshots[0] : undefined) || (item.mediaUrls && item.mediaUrls.length > 0 ? item.mediaUrls[0] : undefined) || getMarketplaceImage(item),
    tag: item.version || category,
    tagList,
    itemType: 'asset',
    version: item.version || '1.0.0',
    screenshots: (item.screenshots && item.screenshots.length > 0) ? item.screenshots : (item.mediaUrls || []),
    videoUrl: item.videoUrl,
    documentation: '',

    lastUpdated: formatMarketplaceDate(item.updatedAt || item.createdAt, t),
    details: {
      tilesCount: t('app.marketplace.packArchive'),
      spritesCount: t('app.marketplace.readyResources'),
      propsCount: t('app.marketplace.filePackage'),
      featuresList: [
        t('app.marketplace.feature.realListing'),
        t('app.marketplace.feature.importPipeline'),
        category
          ? t('app.marketplace.feature.categoryPreserved', { category })
          : t('app.marketplace.feature.categoryMetadataPreserved')
      ]
    }
  };
};

// Helper functions for mapping URLs to screen states
const pathToScreen = (path: string): { screen: ScreenType; assetId?: string } => {
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) {
    return { screen: 'explore' };
  }
  const primary = segments[0];
  if (primary === 'marketplace') return { screen: 'marketplace' };
  if (primary === 'checkout') return { screen: 'checkout' };
  if (primary === 'payment') {
    if (segments[1] === 'qr') return { screen: 'payment-qr' };
    if (segments[1] === 'success') return { screen: 'payment-success' };
    if (segments[1] === 'failed') return { screen: 'payment-failed' };
    if (segments[1] === 'cancelled') return { screen: 'payment-cancelled' };
    return { screen: 'payment' };
  }
  if (primary === 'upload') return { screen: 'upload' };
  if (primary === 'path') return { screen: 'path' };
  if (primary === 'dashboard') return { screen: 'dashboard' };
  if (primary === 'wallet') return { screen: 'wallet' };
  if (primary === 'community') {
    if (segments[1] === 'detail' && segments[2]) {
      return { screen: 'community-detail', assetId: segments[2] };
    }
    return { screen: 'community' };
  }
  if (primary === 'signin') return { screen: 'signin' };
  if (primary === 'signup') return { screen: 'signup' };
  if (primary === 'profile') {
    if (segments[1]) {
      return { screen: 'author-profile', assetId: segments[1] };
    }
    return { screen: 'profile' };
  }
  if (primary === 'admin') return { screen: 'admin' };
  if (primary === 'developer-onboarding') return { screen: 'developer-onboarding' };
  if (primary === 'auth' && (segments[1] === 'callback' || (segments[1] === 'github' && segments[2] === 'callback'))) {
    return { screen: 'auth-callback' };
  }
  if (primary === 'detail') {
    return { screen: 'detail', assetId: segments[1] };
  }
  return { screen: 'explore' };
};

const screenToPath = (screen: ScreenType, assetId?: string): string => {
  if (screen === 'explore') return '/';
  if (screen === 'detail' && assetId) return `/detail/${assetId}`;
  if (screen === 'community-detail' && assetId) return `/community/detail/${assetId}`;
  if (screen === 'author-profile' && assetId) return `/profile/${assetId}`;
  if (screen === 'auth-callback') return '/auth/callback';
  if (screen === 'payment-success') return '/payment/success';
  if (screen === 'payment-qr') return '/payment/qr';
  if (screen === 'payment-failed') return '/payment/failed';
  if (screen === 'payment-cancelled') return '/payment/cancelled';
  if (screen === 'wallet') return '/wallet';
  return `/${screen}`;
};

export default function App() {
  const { t, i18n } = useTranslation(['shared']);
  const initialRoute = pathToScreen(window.location.pathname);
  const [currentScreen, setCurrentScreen] = useState<ScreenType>(initialRoute.screen);
  const [checkoutOriginScreen, setCheckoutOriginScreen] = useState<ScreenType>(
    initialRoute.screen === 'checkout' ? 'marketplace' : initialRoute.screen,
  );
  const { currentUser, logout } = useAuth();
  const { showToast } = useToast();
  const setCurrentUser = (user: User | null) => {
    if (user === null) {
      logout();
    }
  };
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (storedTheme === 'dark') return true;
      if (storedTheme === 'light') return false;
    } catch (error) {
      console.warn('Failed to read stored theme preference:', error);
    }

    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
  });
  const displayScreen = currentScreen === 'checkout' ? checkoutOriginScreen : currentScreen;
  const isCheckoutModalOpen = currentScreen === 'checkout';
  const usesDashboardWorkspaceBackground = displayScreen === 'dashboard';
  const usesSolidStorefrontBackground =
    displayScreen === 'explore' || displayScreen === 'marketplace';
  const isAdminManagedScreen =
    currentUser?.role === 'admin' &&
    (displayScreen === 'admin' ||
      displayScreen === 'profile');

  const redirectAdminToSection = useCallback((
    section: 'overview' | 'finance',
    tab?: 'wallet' | 'payments',
  ) => {
    setCurrentScreen('admin');
    dispatchAdminNavigation(
      tab ? { section, tab } : { section },
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      return;
    }

    const storefrontScreens: ScreenType[] = [
      'explore',
      'marketplace',
      'detail',
      'community',
      'community-detail',
      'author-profile',
    ];
    const creatorScreens: ScreenType[] = [
      'upload',
      'path',
      'dashboard',
      'developer-onboarding',
    ];
    const sharedFinanceScreens: ScreenType[] = [
      'payment',
      'payment-qr',
      'payment-success',
      'payment-failed',
      'payment-cancelled',
      'checkout',
    ];

    if (currentScreen === 'wallet') {
      redirectAdminToSection('finance', 'wallet');
      return;
    }

    if (sharedFinanceScreens.includes(currentScreen)) {
      redirectAdminToSection('finance', 'payments');
      return;
    }

    if (
      storefrontScreens.includes(displayScreen) ||
      creatorScreens.includes(displayScreen)
    ) {
      redirectAdminToSection('overview');
    }
  }, [
    currentUser?.role,
    currentScreen,
    displayScreen,
    redirectAdminToSection,
  ]);

  useEffect(() => {
    if (!isCheckoutModalOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isCheckoutModalOpen]);

  // Listen for public WebSocket-driven community post updates
  useEffect(() => {
    const handlePostUpdate = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (data.type === 'DELETE_POST') {
        const { postId } = data;
        setSelectedPost(prev => {
          if (prev && prev.id === postId) {
            return null;
          }
          return prev;
        });
      } else if (data.type === 'POST_COUNT_UPDATE') {
        const { postId, reactionCount, commentCount, shareCount } = data;
        setSelectedPost(prev => {
          if (prev && prev.id === postId) {
            return { ...prev, reactionCount, commentCount, shareCount };
          }
          return prev;
        });
      }
    };

    window.addEventListener('community-post-update', handlePostUpdate);
    return () => {
      window.removeEventListener('community-post-update', handlePostUpdate);
    };
  }, []);

  useEffect(() => {
    // 1. Disable transitions temporarily to prevent uneven/slow transitions during theme toggle
    document.documentElement.classList.add('disable-transitions');

    document.documentElement.classList.toggle('dark', darkMode);
    document.body.classList.toggle('dark', darkMode);
    document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light';

    // 2. Force a browser reflow to ensure the style changes are applied instantly without animations
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    document.documentElement.offsetHeight;

    // 3. Re-enable transitions in the next frame
    const timeout = window.setTimeout(() => {
      document.documentElement.classList.remove('disable-transitions');
    }, 0);

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, darkMode ? 'dark' : 'light');
    } catch (error) {
      console.warn('Failed to store theme preference:', error);
    }

    return () => {
      window.clearTimeout(timeout);
    };
  }, [darkMode]);

  const [selectedAssetId, setSelectedAssetId] = useState<string>(initialRoute.assetId || 'cyber_interior');
  const [selectedPost, setSelectedPost] = useState<CommunityChatResponse | null>(null);
  const [selectedAuthor, setSelectedAuthor] = useState<UserSummary | null>(null);
  const [searchText, setSearchText] = useState<string>('');
  
  const [assets, setAssets] = useState<Asset[]>([]);
  
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [catalogType, setCatalogType] = useState<'game' | 'asset'>('game');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [godotVersion, setGodotVersion] = useState<string>('All Versions');

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const [gameRes, assetRes] = await Promise.all([
          gameApi.getCategories('game'),
          gameApi.getCategories('asset'),
        ]);
        const allCats: CategoryResponse[] = [];
        if (gameRes.success && gameRes.data) allCats.push(...gameRes.data);
        if (assetRes.success && assetRes.data) allCats.push(...assetRes.data);
        setCategories(allCats);
      } catch (err) {
        console.error("Failed to load categories in App:", err);
      }
    };
    loadCategories();
  }, [i18n.language]);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<'popular' | 'price-low' | 'price-high'>('popular');

  const [cart, setCart] = useState<Asset[]>([]);
  const [resumeCheckoutContext, setResumeCheckoutContext] =
    useState<PendingCheckoutContext | null>(() => {
      if (initialRoute.screen !== 'checkout') return null;
      const context = readPendingCheckoutContext();
      return context?.readyToResume ? context : null;
    });
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [paymentOrders, setPaymentOrders] = useState<PaymentResponse[]>(() => readStoredPayments());
  const [selectedPaymentOrderId, setSelectedPaymentOrderId] = useState<string | null>(() => readStoredSelectedPaymentOrder());
  const [isPlacingOrder, setIsPlacingOrder] = useState<boolean>(false);
  const [isRefreshingPayments, setIsRefreshingPayments] = useState<boolean>(false);

  // Nạp ví (top-up) và mua game/asset đều tạo Payment, nhưng chỉ payment gắn với
  // 1 sản phẩm (marketplaceItemId) mới thực sự là "đơn hàng" — loại nạp ví ra khỏi
  // các màn hình quản lý đơn hàng để không đếm nhầm số đơn đã mua.
  const purchaseOrderPayments = useMemo(
    () => paymentOrders.filter((payment) => Boolean(payment.marketplaceItemId)),
    [paymentOrders]
  );

  // Danh sách id sản phẩm (asset/game) đã mua thành công — dùng để chặn mua lại
  // ngay từ UI (ẩn/khóa nút Mua) thay vì để user đi hết vào trang checkout mới biết.
  const ownedProductIds = useMemo(
    () => new Set(
      purchaseOrderPayments
        .filter((payment) => payment.paymentStatus === 'PAID')
        .map((payment) => payment.marketplaceItemId)
    ),
    [purchaseOrderPayments]
  );

  const creatorOwnedProductIds = useMemo(() => {
    const currentEmail = currentUser?.email?.trim().toLowerCase();
    if (!currentEmail) return new Set<string>();

    return new Set(
      assets
        .filter(
          (asset) => asset.sellerEmail?.trim().toLowerCase() === currentEmail,
        )
        .map((asset) => asset.id),
    );
  }, [assets, currentUser?.email]);

  useEffect(() => {
    sessionStorage.setItem(PAYMENT_SESSION_STORAGE_KEY, JSON.stringify(paymentOrders));
  }, [paymentOrders]);

  useEffect(() => {
    if (selectedPaymentOrderId) {
      sessionStorage.setItem(PAYMENT_SELECTED_ORDER_STORAGE_KEY, selectedPaymentOrderId);
    } else {
      sessionStorage.removeItem(PAYMENT_SELECTED_ORDER_STORAGE_KEY);
    }
  }, [selectedPaymentOrderId]);

  // Load Cart from Server when user logs in
  useEffect(() => {
    if (!currentUser) {
      setCart([]);
      return;
    }

    if (currentUser.role === 'admin') {
      setCart([]);
      return;
    }

    let isCancelled = false;

    const loadCartFromServer = async () => {
      try {
        const response = await cartApi.getCart();
        if (response.success && response.data && !isCancelled) {
          const mappedCart = response.data.map(item => {
            if (item.asset) {
              return mapMarketplaceItemToAsset(item.asset, t);
            } else if (item.game) {
              return mapGameToAsset(item.game);
            }
            return null;
          }).filter((item): item is Asset => item !== null);
          setCart(mappedCart);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Failed to load cart from backend:', error);
        }
      }
    };

    loadCartFromServer();

    return () => {
      isCancelled = true;
    };
  }, [currentUser?.id, t]);

  const syncTrackedPayment = useCallback((payment: PaymentResponse) => {
    setPaymentOrders(prev => {
      const existingIndex = prev.findIndex(item => item.id === payment.id);
      if (existingIndex === -1) {
        return [payment, ...prev];
      }

      const next = [...prev];
      next[existingIndex] = payment;
      return next;
    });
    setSelectedPaymentOrderId(prev => (prev === payment.orderId ? prev : payment.orderId));
  }, []);

  const replaceTrackedPayments = useCallback((payments: PaymentResponse[], preferredOrderId?: string | null) => {
    setPaymentOrders(payments);
    setSelectedPaymentOrderId(prev => {
      const nextOrderId = preferredOrderId ?? prev;
      if (nextOrderId && payments.some(payment => payment.orderId === nextOrderId)) {
        return nextOrderId;
      }

      return payments[0]?.orderId ?? null;
    });
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setPaymentOrders([]);
      setSelectedPaymentOrderId(null);
      return;
    }

    if (currentUser.role === 'admin') {
      setPaymentOrders([]);
      setSelectedPaymentOrderId(null);
      return;
    }

    let isCancelled = false;

    const loadTrackedPaymentsFromServer = async () => {
      try {
        const response = await paymentApi.getMyPayments();
        if (!response.success || !response.data || isCancelled) {
          return;
        }

        replaceTrackedPayments(response.data);
      } catch (error) {
        if (!isCancelled) {
          console.error('Failed to load payment history from backend:', error);
        }
      }
    };

    loadTrackedPaymentsFromServer();

    return () => {
      isCancelled = true;
    };
  }, [currentUser?.id, replaceTrackedPayments]);

  const mapGameToAsset = (game: any): Asset => ({
    id: game.id,
    title: game.title,
    price: game.priceProposed || 0,
    rating: 5.0,
    reviewedCount: 0,
    author: game.creatorFullName || game.creatorName || t('app.marketplace.unknownCreator'),
    authorAvatar: DEFAULT_AUTHOR_AVATAR,
    category: game.categoryName || t('app.marketplace.uncategorized'),
    description: game.description || '',
    image: game.thumbnailUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    tag: game.publishingType
      ? t('app.marketplace.publishingPrefix', { value: game.publishingType })
      : t('app.marketplace.gameTag'),
    tagList: game.tags && game.tags.length > 0 ? game.tags : [game.publishingType || 'Marketplace', game.status || 'Published'],
    version: game.version || '1.0.0',
    lastUpdated: t('app.marketplace.justNow'),
    details: {
      tilesCount: 'N/A',
      spritesCount: 'Included',
      propsCount: 'Editable',
      featuresList: [
        t('app.marketplace.feature.premiumProject'),
        t('app.marketplace.feature.verifiedSafe'),
      ]
    },
    screenshots: game.screenshots,
    videoUrl: game.videoUrl,
    webDemoUrl: game.webDemoUrl,
    itemType: 'source_code'
  });

  useEffect(() => {
    let isCancelled = false;

    const fetchAllCatalogItems = async () => {
      try {
        const [assetRes, gameRes] = await Promise.all([
          marketplaceApi.getAllMarketplaceItems('active', searchText),
          gameApi.getAllGames('published', searchText),
        ]);

        if (isCancelled) return;

        let mappedAssets: Asset[] = [];
        if (assetRes.success && assetRes.data) {
          mappedAssets = assetRes.data.map((item) => mapMarketplaceItemToAsset(item, t));
        }

        let mappedGames: Asset[] = [];
        if (gameRes.success && gameRes.data) {
          const eligible = gameRes.data.filter(
            (g) => !g.publishingType || g.publishingType === 'marketplace_listing'
          );
          mappedGames = eligible.map(mapGameToAsset);
        }

        setAssets([...mappedAssets, ...mappedGames]);
      } catch (err) {
        console.error('Failed to load catalog items from backend:', err);
      }
    };

    if (currentScreen === 'marketplace' || currentScreen === 'explore' || currentScreen === 'detail') {
      fetchAllCatalogItems();
    }

    return () => {
      isCancelled = true;
    };
  }, [currentScreen, i18n.language, searchText]);

  const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'tech' | 'documentation'>('overview');
  const [selectedThumbIndex, setSelectedThumbIndex] = useState<number>(0);

  // Sync state changes with URL address bar
  useEffect(() => {
    const newPath = screenToPath(currentScreen, currentScreen === 'detail' ? selectedAssetId : undefined);
    if (window.location.pathname !== newPath) {
      window.history.pushState(null, '', newPath);
    }
  }, [currentScreen, selectedAssetId]);

  // Sync browser Back/Forward buttons navigation
  useEffect(() => {
    const handlePopState = () => {
      const { screen, assetId } = pathToScreen(window.location.pathname);
      setCurrentScreen(screen);
      if (assetId) {
        setSelectedAssetId(assetId);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if ((currentScreen === 'payment' || currentScreen === 'dashboard') && currentUser && currentUser.role !== 'admin') {
      refreshTrackedPayments();
    }
  }, [currentScreen, currentUser?.id]);

  const handlePaymentOutcomeNotification = useCallback((
    payment: PaymentResponse,
    variant: 'success' | 'failed' | 'cancelled'
  ) => {
    if (payment.paymentStatus === 'PAID') {
      showToast(t('app.toast.purchaseSuccessItem', { title: payment.marketplaceItemTitle }), 'success');
      return;
    }

    if (payment.paymentStatus === 'FAILED') {
      showToast(t('app.toast.purchaseFailedItem', { title: payment.marketplaceItemTitle }), 'error');
      return;
    }

    if (payment.paymentStatus === 'CANCELLED' || variant === 'cancelled') {
      showToast(t('app.toast.purchaseCancelledItem', { title: payment.marketplaceItemTitle }), 'warning');
      return;
    }

    if (payment.paymentStatus === 'EXPIRED') {
      showToast(t('app.toast.purchaseExpiredItem', { title: payment.marketplaceItemTitle }), 'warning');
      return;
    }

    if (variant === 'success') {
      showToast(t('app.toast.purchasePendingConfirmItem', { title: payment.marketplaceItemTitle }), 'info');
      return;
    }

    if (variant === 'failed') {
      showToast(t('app.toast.purchaseIncompleteItem', { title: payment.marketplaceItemTitle }), 'error');
    }
  }, [showToast, t]);

  // Switch to Detail Screen helper
  const handleViewAssetDetails = (asset: Asset) => {
    setSelectedAssetId(asset.id);
    setSelectedThumbIndex(0);
    setCurrentScreen('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Switch to Marketplace with Category pre-selected helper
  const handleCategoryClick = (categoryName: string) => {
    const isAssetCategory = assets.some(a => a.category === categoryName && a.itemType === 'asset');
    setCatalogType(isAssetCategory ? 'asset' : 'game');
    setSelectedCategories([categoryName]);
    setSelectedTags([]);
    setCurrentScreen('marketplace');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTagClick = (tag: string) => {
    const matchingAsset = assets.find(a => a.tagList?.includes(tag) || a.tag === tag);
    if (matchingAsset) {
      setCatalogType(matchingAsset.itemType === 'asset' ? 'asset' : 'game');
    }
    setSelectedCategories([]);
    setSelectedTags([tag]);
    setCurrentScreen('marketplace');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuthorClick = (authorName: string) => {
    const matchingAsset = assets.find(a => a.author && a.author.toLowerCase() === authorName.toLowerCase());
    if (matchingAsset) {
      setCatalogType(matchingAsset.itemType === 'asset' ? 'asset' : 'game');
    }
    setSearchText(authorName);
    setSelectedCategories([]);
    setSelectedTags([]);
    setCurrentScreen('marketplace');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Add Item to Cart
  const handleAddToCart = async (asset: Asset, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUser) {
      showToast(t('app.toast.loginRequiredAddToCart'), "warning");
      setCurrentScreen('signin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (creatorOwnedProductIds.has(asset.id)) {
      showToast(t('app.toast.cannotBuyOwnProduct'), "warning");
      return;
    }
    if (ownedProductIds.has(asset.id)) {
      showToast(t('app.toast.ownedAlready'), "warning");
      return;
    }

    if (cart.some(item => item.id === asset.id)) {
      setIsCartOpen(true);
      return;
    }

    try {
      const itemType = asset.itemType === 'source_code' ? 'source_code' : 'asset';
      const response = await cartApi.addToCart({ itemId: asset.id, itemType });
      if (response.success) {
        setCart(prev => [...prev, asset]);
        setIsCartOpen(true);
      } else {
        showToast(response.message || "Failed to add item to cart", "error");
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || "Failed to add item to cart";
      showToast(errMsg, "error");
    }
  };

  // Remove Item from Cart
  const handleRemoveFromCart = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await cartApi.removeFromCart(id);
      setCart(prev => prev.filter(item => item.id !== id));
    } catch (err: any) {
      const errMsg = err.response?.data?.message || "Failed to remove item from cart";
      showToast(errMsg, "error");
    }
  };

  const handleBuyNow = (asset: Asset) => {
    if (!currentUser) {
      showToast(t('app.toast.loginRequiredBuy'), "warning");
      setCurrentScreen('signin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!asset.itemType) {
      showToast(t('app.toast.onlyMarketplacePaymentSupported'), "warning");
      return;
    }

    if (creatorOwnedProductIds.has(asset.id)) {
      showToast(t('app.toast.cannotBuyOwnProduct'), "warning");
      return;
    }

    if (ownedProductIds.has(asset.id)) {
      showToast(t('app.toast.ownedAlready'), "warning");
      return;
    }

    setCart(prev => {
      if (prev.some(item => item.id === asset.id)) {
        return prev;
      }
      return [...prev, asset];
    });
    setIsCartOpen(false);
    setCheckoutOriginScreen(currentScreen === 'checkout' ? checkoutOriginScreen : currentScreen);
    setCurrentScreen('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Navigate to checkout instead of simulating an immediate completed purchase
  const handleCheckout = () => {
    if (!currentUser) {
      showToast(t('app.toast.loginRequiredBuy'), "warning");
      setCurrentScreen('signin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (cart.length === 0) {
      showToast(t('app.toast.cartEmpty'), "info");
      return;
    }

    if (cart.some((item) => creatorOwnedProductIds.has(item.id))) {
      showToast(t('app.toast.cannotBuyOwnProduct'), "warning");
      return;
    }

    setIsCartOpen(false);
    setCheckoutOriginScreen(currentScreen === 'checkout' ? checkoutOriginScreen : currentScreen);
    setCurrentScreen('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseCheckoutModal = () => {
    setCurrentScreen(checkoutOriginScreen);
  };

  const handleCheckoutTopUp = useCallback((shortfall: number) => {
    const normalizedShortfall = Math.max(0, Math.ceil(Number(shortfall) || 0));
    if (normalizedShortfall <= 0 || cart.length === 0) return;

    storePendingCheckoutContext({
      cartItemIds: cart.map((item) => item.id),
      itemTitles: cart.map((item) => item.title),
      totalAmount: cart.reduce((sum, item) => sum + Number(item.price || 0), 0),
      shortfall: normalizedShortfall,
      createdAt: new Date().toISOString(),
      readyToResume: false,
    });
    setResumeCheckoutContext(null);
    window.history.pushState(null, '', '/wallet?suggestTopUp=1');
    setCurrentScreen('wallet');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [cart]);

  const refreshTrackedPayments = async () => {
    if (!currentUser || currentUser.role === 'admin') {
      return;
    }

    setIsRefreshingPayments(true);
    try {
      let trackedPayments = paymentOrders;
      if (trackedPayments.length === 0) {
        const historyResponse = await paymentApi.getMyPayments();
        if (!historyResponse.success || !historyResponse.data) {
          throw new Error(historyResponse.message || t('app.toast.loadMyPaymentsFailed'));
        }

        trackedPayments = historyResponse.data;
        if (trackedPayments.length === 0) {
          replaceTrackedPayments([]);
          return;
        }
      }

      const refreshedPayments = await Promise.all(
        trackedPayments.map(async (payment) => {
          const response = await paymentApi.confirmPayment(payment.id);
          if (!response.success || !response.data) {
            throw new Error(response.message || t('app.toast.loadPaymentStatusFailed'));
          }
          return response.data;
        })
      );

      replaceTrackedPayments(refreshedPayments, selectedPaymentOrderId);
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || t('app.toast.refreshPaymentFailed'), 'error');
    } finally {
      setIsRefreshingPayments(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!currentUser) {
      showToast(t('app.toast.loginRequiredBuy'), "warning");
      setCurrentScreen('signin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (cart.length === 0) {
      showToast(t('app.toast.cartEmpty'), "info");
      return;
    }

    if (cart.some((item) => creatorOwnedProductIds.has(item.id))) {
      showToast(t('app.toast.cannotBuyOwnProduct'), "warning");
      return;
    }

    const unsupportedItems = cart.filter((item) => !item.itemType);
    if (unsupportedItems.length > 0) {
      showToast(t('app.toast.unsupportedCartItems'), "warning");
      return;
    }

    if (cart.length > 1) {
      showToast(t('app.toast.singleItemPayos'), "warning");
      return;
    }

    const nonPersistedMarketplaceItems = cart.filter((item) => !UUID_PATTERN.test(item.id));
    if (nonPersistedMarketplaceItems.length > 0) {
      showToast(t('app.toast.demoDataNoPayment'), "warning");
      return;
    }

    setIsPlacingOrder(true);
    try {
      const checkoutItem = cart[0];
      const orderType = checkoutItem.itemType === 'source_code' ? 'source_code_purchase' : 'asset_purchase';

      const response = await orderApi.createOrder({
        targetId: checkoutItem.id,
        orderType: orderType
      });

      if (!response.success || !response.data) {
        throw new Error(response.message || t('app.toast.createOrderFailedFor', { title: checkoutItem.title }));
      }

      showToast(t('app.toast.buySuccess'), "success");
      try {
        await cartApi.clearCart();
      } catch (e) {
        console.warn("Failed to clear cart on server", e);
      }
      setCart([]);
      setIsCartOpen(false);

      // Tải lại lịch sử mua hàng để cập nhật trạng thái
      const historyResponse = await paymentApi.getMyPayments();
      if (historyResponse.success && historyResponse.data) {
        replaceTrackedPayments(historyResponse.data);
      }

      setCurrentScreen('payment');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      const errorCode = err.response?.data?.code;
      const shortfallValue =
        err.response?.data?.data?.shortfall ?? err.response?.data?.shortfall;
      const shortfall = Number(shortfallValue);

      if (
        errorCode === 'INSUFFICIENT_BALANCE' &&
        Number.isFinite(shortfall) &&
        shortfall > 0
      ) {
        showToast(
          t('app.toast.walletShortfall', {
            amount: `${shortfall.toLocaleString('vi-VN')}đ`,
          }),
          'warning',
        );
        handleCheckoutTopUp(shortfall);
      } else if (errorCode === 'DATA_CONFLICT') {
        showToast(t('app.toast.dataConflict'), 'warning');
      } else {
        showToast(err.response?.data?.message || err.message || t('app.toast.walletPurchaseFailed'), 'error');
      }
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleOpenPaymentQr = useCallback((payment: PaymentResponse) => {
    const existingSession = readPaymentQrSession(payment.id);
    storePaymentQrSession(payment, existingSession?.expiresAt);

    window.history.pushState(
      null,
      '',
      `/payment/qr?paymentId=${encodeURIComponent(payment.id)}`,
    );
    setCurrentScreen('payment-qr');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleQrPaymentPaid = useCallback((payment: PaymentResponse) => {
    syncTrackedPayment(payment);
    clearPaymentQrSession(payment.id);

    const isTopUpPayment =
      payment.paymentReference?.startsWith('TOPUP:') ||
      (!payment.marketplaceItemId && !payment.orderId);

    if (isTopUpPayment) {
      const pendingCheckout = readPendingCheckoutContext();
      if (
        pendingCheckout &&
        (!pendingCheckout.triggeredTopUpPaymentId ||
          pendingCheckout.triggeredTopUpPaymentId === payment.id)
      ) {
        const readyContext = updatePendingCheckoutContext({
          triggeredTopUpPaymentId: payment.id,
          readyToResume: true,
        });
        if (readyContext) {
          setResumeCheckoutContext(readyContext);
          setCheckoutOriginScreen('wallet');
          window.history.pushState(null, '', '/checkout?resumeTopUp=1');
          setCurrentScreen('checkout');
          showToast(t('app.toast.topUpSuccessResumeCheckout'), 'success');
          return;
        }
      }

      showToast(t('app.toast.topUpSuccess'), 'success');
      setCurrentScreen('wallet');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    window.history.pushState(
      null,
      '',
      `/payment/success?paymentId=${encodeURIComponent(payment.id)}`,
    );
    setCurrentScreen('payment-success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [showToast, syncTrackedPayment, t]);

  const handleResumeCheckoutLater = () => {
    clearPendingCheckoutContext();
    setResumeCheckoutContext(null);
  };

  const handleResumeCheckoutNow = async () => {
    clearPendingCheckoutContext();
    setResumeCheckoutContext(null);
    await handlePlaceOrder();
  };

  const handleCancelPayment = async (paymentId: string) => {
    try {
      const response = await paymentApi.cancelPayment(paymentId);
      if (!response.success || !response.data) {
        throw new Error(response.message || t('app.toast.cancelPaymentFailed'));
      }

      syncTrackedPayment(response.data);
      showToast(t('app.toast.cancelPaymentSuccess'), "success");
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || t('app.toast.cancelPaymentFailed'), 'error');
      throw err;
    }
  };

  const marketplaceCatalogAssets = useMemo(
    () => assets.filter((item): item is Asset & { itemType: 'source_code' | 'asset' } => Boolean(item.itemType)),
    [assets]
  );

  const getCategoryAndDescendants = useCallback((categoryNames: string[]): string[] => {
    if (categoryNames.length === 0 || categories.length === 0) return categoryNames;
    
    const result = new Set<string>();
    
    // Helper function to recursively find child categories
    const addDescendants = (catId: string) => {
      const children = categories.filter(c => c.parentId === catId);
      children.forEach(child => {
        result.add(child.name);
        addDescendants(child.id);
      });
    };

    categoryNames.forEach(name => {
      result.add(name);
      const found = categories.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (found) {
        addDescendants(found.id);
      }
    });

    return Array.from(result);
  }, [categories]);

  // Filter & Sort Logic for Marketplace
  const filteredAssets = useMemo(() => {
    const query = searchText ? searchText.trim().toLowerCase() : '';
    return marketplaceCatalogAssets.filter(item => {
      // Search Box Filter
      if (query) {
        const titleMatch = (item.title || '').toLowerCase().includes(query);
        const tagMatch = (item.tag || '').toLowerCase().includes(query);
        const authorMatch = (item.author || '').toLowerCase().includes(query);
        const categoryMatch = (item.category || '').toLowerCase().includes(query);
        const tagListMatch = (item.tagList || []).some(t => (t || '').toLowerCase().includes(query));
        if (!titleMatch && !tagMatch && !authorMatch && !categoryMatch && !tagListMatch) {
          return false;
        }
      }
      
      // Category Checkboxes Filter
      if (selectedCategories.length > 0) {
        const firstSelCat = selectedCategories[0];
        const categoryEntity = categories.find(c => c.name.toLowerCase() === firstSelCat.toLowerCase());
        const categoryType = categoryEntity?.type; // 'game' or 'asset'

        const itemMatchesCategoryType = 
          (item.itemType === 'source_code' && categoryType === 'game') ||
          (item.itemType === 'asset' && categoryType === 'asset');

        if (itemMatchesCategoryType) {
          const allowedCategories = getCategoryAndDescendants(selectedCategories);
          if (!allowedCategories.some(catName => catName.toLowerCase() === (item.category || '').toLowerCase())) return false;
        }
      }

      // Max price filter
      if (maxPrice !== null && item.price > maxPrice) return false;

      return true;
    }).sort((a, b) => {
      if (query) {
        const aTitle = (a.title || '').toLowerCase().includes(query) ? 2 : 1;
        const bTitle = (b.title || '').toLowerCase().includes(query) ? 2 : 1;
        if (aTitle !== bTitle) return bTitle - aTitle;
      }
      if (sortOrder === 'price-low') return a.price - b.price;
      if (sortOrder === 'price-high') return b.price - a.price;
      return b.rating - a.rating; // default standard popularity index
    });
  }, [marketplaceCatalogAssets, searchText, selectedCategories, maxPrice, sortOrder, getCategoryAndDescendants]);

  // Current Detail entity focus
  const focusedAsset = useMemo(() => {
    return assets.find(a => a.id === selectedAssetId) || assets[0];
  }, [assets, selectedAssetId]);

  // Toggle Category Selection
  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  // Interactive Projects Array mapped to custom reusable DataTable component
  const projectRepositories = useMemo(
    () => [
      { id: '1', projectName: 'Skyward Chronicles Engine', version: 'v4.1.2', date: t('app.projectDate.justNow'), status: 'LIVE' as const, engine: 'Godot 4.1-Stable', downloads: '12.4k' },
      { id: '2', projectName: 'Neon Drift Mechanics Module', version: 'v2.0.1', date: t('app.projectDate.hoursAgo', { count: 3 }), status: 'LIVE' as const, engine: 'Godot 4.2-Dev3', downloads: '3.1k' },
      { id: '3', projectName: 'Retro Platformer Pro Controller', version: 'v1.4.0', date: t('app.projectDate.yesterday'), status: 'BETA' as const, engine: 'Godot 3.5 LTS', downloads: '890' },
      { id: '4', projectName: 'Isometric Combat Pathfinder', version: 'v0.9.8-Beta', date: t('app.projectDate.lastWeek'), status: 'BETA' as const, engine: 'Godot 4.x-Beta', downloads: '1,420' },
      { id: '5', projectName: 'Procedural Terrain Generator', version: 'v0.2.1-Alpha', date: t('app.projectDate.may10'), status: 'ALPHA' as const, engine: 'Godot 4.3', downloads: '112' }
    ],
    [t],
  );

  return (
    <div id="godotlaunch-root" className={`${darkMode ? 'dark bg-night-950 text-slate-100' : 'bg-slate-50 text-slate-800'} min-h-screen flex flex-col font-sans transition-colors duration-300 relative`}>
      
      {/* 3D Voxel Nature Environment Background — ẩn riêng ở trang developer-onboarding (landing dùng nền tối riêng) */}
      {displayScreen !== 'developer-onboarding' && (
        usesDashboardWorkspaceBackground ? (
          <div className="dashboard-workspace-background fixed inset-0 z-0 pointer-events-none" />
        ) : usesSolidStorefrontBackground ? (
          <div className="storefront-solid-background fixed inset-0 z-0 pointer-events-none" />
        ) : (
          <>
            <img
              id="voxel-background-layer"
              src={VOXEL_BG_IMAGE}
              alt={t('app.voxelBackgroundAlt')}
              className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none transition-all duration-700"
              style={{
                filter: darkMode ? 'brightness(0.4) contrast(1.1) saturate(1.12)' : 'brightness(0.98) contrast(1.0) saturate(1.0)'
              }}
              referrerPolicy="no-referrer"
            />

            <div
              id="voxel-background-tint"
              className="storefront-background-shade fixed inset-0 z-[1] pointer-events-none transition-all duration-700"
            />

            <div className="fixed inset-0 pointer-events-none pixel-grid-overlay z-[2]"></div>
          </>
        )
      )}

      {/* HEADER SECTION */}
      {isAdminManagedScreen ? (
        <AdminHeader
          setCurrentScreen={setCurrentScreen}
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          setSelectedAssetId={setSelectedAssetId}
          setSelectedPost={setSelectedPost}
          setSelectedAuthor={setSelectedAuthor}
        />
      ) : (
        <Header
          currentScreen={displayScreen}
          setCurrentScreen={setCurrentScreen}
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          cart={cart}
          isCartOpen={isCartOpen}
          setIsCartOpen={setIsCartOpen}
          handleRemoveFromCart={handleRemoveFromCart}
          handleCheckout={handleCheckout}
          setSelectedAssetId={setSelectedAssetId}
          setSelectedPost={setSelectedPost}
          setSelectedAuthor={setSelectedAuthor}
          searchText={searchText}
          setSearchText={setSearchText}
        />
      )}

      {/* PRIMARY VIEWS SWITCHER WITH STUNNING ACCENTUATIONS */}
      <main
        className={`relative z-10 flex-grow ${
          displayScreen === 'explore'
            ? 'w-full max-w-none px-0 py-0'
            : displayScreen === 'admin'
            ? 'w-full max-w-none px-0 py-0'
            : displayScreen === 'developer-onboarding'
            ? 'w-full max-w-none px-0 py-0'
            : displayScreen === 'dashboard' || displayScreen === 'marketplace'
            ? 'mx-auto w-full max-w-[1440px] px-5 py-6 sm:px-8 lg:px-12'
            : displayScreen === 'detail'
            ? 'mx-auto w-full max-w-[1440px] px-5 py-6 sm:px-8 lg:px-12'
            : 'mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8'
        }`}
      >
        
        {displayScreen === 'explore' && (
          <HomePage
            assets={assets}
            setCurrentScreen={setCurrentScreen}
            handleCategoryClick={handleCategoryClick}
            handleViewAssetDetails={handleViewAssetDetails}
            handleAddToCart={handleAddToCart}
            ownedProductIds={ownedProductIds}
            creatorOwnedProductIds={creatorOwnedProductIds}
          />
        )}

        {displayScreen === 'marketplace' && (
          <MarketplacePage
            allAssets={assets}
            filteredAssets={filteredAssets}
            searchText={searchText}
            setSearchText={setSearchText}
            selectedCategories={selectedCategories}
            toggleCategory={toggleCategory}
            godotVersion={godotVersion}
            setGodotVersion={setGodotVersion}
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            handleViewAssetDetails={handleViewAssetDetails}
            handleAddToCart={handleAddToCart}
            setSelectedCategories={setSelectedCategories}
            ownedProductIds={ownedProductIds}
            creatorOwnedProductIds={creatorOwnedProductIds}
            catalogType={catalogType}
            setCatalogType={setCatalogType}
            selectedTags={selectedTags}
            setSelectedTags={setSelectedTags}
          />
        )}

        {currentScreen === 'payment' && (
          <ProtectedRoute setCurrentScreen={setCurrentScreen}>
            <PaymentDetailPage
              payments={purchaseOrderPayments}
              selectedOrderId={selectedPaymentOrderId}
              setSelectedOrderId={setSelectedPaymentOrderId}
              isRefreshing={isRefreshingPayments}
              onBackToMarketplace={() => {
                setCurrentScreen('marketplace');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onRefreshPayments={refreshTrackedPayments}
              onCancelPayment={handleCancelPayment}
              setCurrentScreen={setCurrentScreen}
            />
          </ProtectedRoute>
        )}

        {currentScreen === 'payment-qr' && (
          <ProtectedRoute setCurrentScreen={setCurrentScreen}>
            <PaymentQrPage
              setCurrentScreen={setCurrentScreen}
              onPaymentUpdated={syncTrackedPayment}
              onPaymentPaid={handleQrPaymentPaid}
            />
          </ProtectedRoute>
        )}

        {currentScreen === 'payment-success' && (
          <ProtectedRoute setCurrentScreen={setCurrentScreen}>
            <PaymentResultPage
              variant="success"
              setCurrentScreen={setCurrentScreen}
              onPaymentLoaded={syncTrackedPayment}
              onPaymentResolved={handlePaymentOutcomeNotification}
            />
          </ProtectedRoute>
        )}

        {currentScreen === 'payment-failed' && (
          <ProtectedRoute setCurrentScreen={setCurrentScreen}>
            <PaymentResultPage
              variant="failed"
              setCurrentScreen={setCurrentScreen}
              onPaymentLoaded={syncTrackedPayment}
              onPaymentResolved={handlePaymentOutcomeNotification}
            />
          </ProtectedRoute>
        )}

        {currentScreen === 'payment-cancelled' && (
          <ProtectedRoute setCurrentScreen={setCurrentScreen}>
            <PaymentResultPage
              variant="cancelled"
              setCurrentScreen={setCurrentScreen}
              onPaymentLoaded={syncTrackedPayment}
              onPaymentResolved={handlePaymentOutcomeNotification}
            />
          </ProtectedRoute>
        )}

        {displayScreen === 'detail' && focusedAsset && (
          <DetailPage
            focusedAsset={focusedAsset}
            setCurrentScreen={setCurrentScreen}
            selectedThumbIndex={selectedThumbIndex}
            setSelectedThumbIndex={setSelectedThumbIndex}
            activeDetailTab={activeDetailTab}
            setActiveDetailTab={setActiveDetailTab}
            handleAddToCart={handleAddToCart}
            handleCheckout={handleCheckout}
            handleBuyNow={handleBuyNow}
            assets={assets}
            handleViewAssetDetails={handleViewAssetDetails}
            currentUser={currentUser}
            showToast={showToast}
            ownedProductIds={ownedProductIds}
            creatorOwnedProductIds={creatorOwnedProductIds}
            purchaseOrderPayments={purchaseOrderPayments}
            handleCategoryClick={handleCategoryClick}
            handleTagClick={handleTagClick}
            handleAuthorClick={handleAuthorClick}
          />
        )}

        {displayScreen === 'upload' && (
          <ProtectedRoute setCurrentScreen={setCurrentScreen} requiredRole="developer">
            <UploadPage setCurrentScreen={setCurrentScreen} />
          </ProtectedRoute>
        )}

        {displayScreen === 'path' && (
          <PathPage
            setCurrentScreen={setCurrentScreen}
          />
        )}

        {displayScreen === 'dashboard' && (
          <ProtectedRoute setCurrentScreen={setCurrentScreen}>
            <DashboardPage
              currentUser={currentUser}
              projectRepositories={projectRepositories}
              purchasedPayments={purchaseOrderPayments}
              selectedPaymentOrderId={selectedPaymentOrderId}
              setSelectedPaymentOrderId={(orderId) => setSelectedPaymentOrderId(orderId)}
              isRefreshingPayments={isRefreshingPayments}
              onRefreshPayments={refreshTrackedPayments}
              onCancelPayment={handleCancelPayment}
              setCurrentScreen={setCurrentScreen}
            />
          </ProtectedRoute>
        )}

        {displayScreen === 'wallet' && (
          <ProtectedRoute setCurrentScreen={setCurrentScreen}>
            <WalletPage
              setCurrentScreen={setCurrentScreen}
              onOpenPaymentQr={handleOpenPaymentQr}
            />
          </ProtectedRoute>
        )}

        {displayScreen === 'author-profile' && (
          <ProfileScreen
            author={selectedAuthor || undefined}
            authorId={selectedAssetId}
            onNavigateBack={() => {
              setCurrentScreen('explore');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {displayScreen === 'signin' && (
          <SignInPage
            setCurrentScreen={setCurrentScreen}
            setCurrentUser={setCurrentUser}
          />
        )}

        {displayScreen === 'signup' && (
          <SignUpPage
            setCurrentScreen={setCurrentScreen}
            setCurrentUser={setCurrentUser}
            darkMode={darkMode}
          />
        )}

        {displayScreen === 'auth-callback' && (
          <GitHubCallbackPage
            setCurrentScreen={setCurrentScreen}
            setCurrentUser={setCurrentUser}
          />
        )}

        {displayScreen === 'admin' && (
          <ProtectedRoute setCurrentScreen={setCurrentScreen} requiredRole="admin">
            <AdminPage
              setCurrentScreen={setCurrentScreen}
              currentUser={currentUser}
            />
          </ProtectedRoute>
        )}

        {displayScreen === 'profile' && (
          <ProtectedRoute setCurrentScreen={setCurrentScreen}>
            <ProfilePage setCurrentScreen={setCurrentScreen} />
          </ProtectedRoute>
        )}

        {displayScreen === 'developer-onboarding' && (
          <ProtectedRoute setCurrentScreen={setCurrentScreen}>
            <DeveloperOnboardingPage setCurrentScreen={setCurrentScreen} />
          </ProtectedRoute>
        )}

      </main>

      {isCheckoutModalOpen && (
        <ProtectedRoute setCurrentScreen={setCurrentScreen}>
          <CheckoutPage
            cart={cart}
            isPlacingOrder={isPlacingOrder}
            onClose={handleCloseCheckoutModal}
            onPlaceOrder={handlePlaceOrder}
            onRemoveItem={(id) => handleRemoveFromCart(id)}
            onGoToWallet={handleCheckoutTopUp}
          />
        </ProtectedRoute>
      )}

      {resumeCheckoutContext && isCheckoutModalOpen && (
        <ConfirmResumeCheckoutModal
          context={resumeCheckoutContext}
          cart={cart}
          isProcessing={isPlacingOrder}
          onConfirm={handleResumeCheckoutNow}
          onLater={handleResumeCheckoutLater}
        />
      )}

      {/* FOOTER ACCENTS SECTION */}
      {!isAdminManagedScreen && (
        <Footer
          setCurrentScreen={setCurrentScreen}
          noTopMargin={displayScreen === 'developer-onboarding'}
        />
      )}

      {/* FLOATING AI CHATBOT WIDGET */}
      <AiChatWidget />

    </div>
  );
}
