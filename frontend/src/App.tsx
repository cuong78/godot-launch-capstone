import React, { useState, useMemo, useEffect, useCallback } from 'react';

import { Header } from './components/Header';
import { AdminHeader } from './components/AdminHeader';
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
} from './types';
import { Button } from './components/Button';
import { ShieldAlert, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

// Modular Page Components
import { HomePage } from './page/HomePage';
import { MarketplacePage } from './page/MarketplacePage';
import { DetailPage } from './page/DetailPage';
import { UploadPage } from './page/UploadPage';
import { PathPage } from './page/PathPage';
import { DashboardPage } from './page/DashboardPage';
import { WalletPage } from './page/WalletPage';
import { CommunityPage } from './page/CommunityPage';
import { SignInPage } from './page/SignInPage';
import { SignUpPage } from './page/SignUpPage';
import { AdminPage } from './page/AdminPage';
import { GitHubCallbackPage } from './page/GitHubCallbackPage';
import { ProfilePage } from './page/ProfilePage';
import { CommunityDetailScreen } from './page/CommunityDetailScreen';
import { ProfileScreen } from './page/ProfileScreen';
import { ChatScreen } from './page/ChatScreen';
import { CheckoutPage } from './page/CheckoutPage';
import { PaymentDetailPage } from './page/PaymentDetailPage';
import { PaymentResultPage } from './page/PaymentResultPage';

import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import { useWebSocket } from './context/WebSocketContext';
import { gameApi } from './api/gameApi';
import { communityApi } from './api/communityApi';
import { marketplaceApi } from './api/marketplaceApi';
import { paymentApi } from './api/paymentApi';

// Seed Images loaded from assets folder management
import { VOXEL_BG_IMAGE, IMAGE_SEED_MAP } from '../assets/images';

const DEFAULT_AUTHOR_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80';
const PAYMENT_SESSION_STORAGE_KEY = 'godotlaunch-payment-orders';
const PAYMENT_SELECTED_ORDER_STORAGE_KEY = 'godotlaunch-selected-payment-order';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

const normalizeMarketplaceCategory = (
  categoryName?: string,
  itemType?: Asset['itemType']
): Asset['category'] => {
  const normalized = categoryName?.trim().toLowerCase();

  switch (normalized) {
    case 'scripts & plugins':
    case 'scripts-plugins':
    case 'scripts and plugins':
      return 'Scripts & Plugins';
    case 'shaders & vfx':
    case 'shaders-vfx':
    case 'shaders and vfx':
      return 'Shaders & VFX';
    case '2d assets':
    case '2d-assets':
      return '2D Assets';
    case '3d models':
    case '3d-models':
      return '3D Models';
    case 'audio & sfx':
    case 'audio-sfx':
    case 'audio and sfx':
      return 'Audio & SFX';
    default:
      return itemType === 'source_code' ? 'Scripts & Plugins' : '2D Assets';
  }
};

const formatMarketplaceDate = (date?: string) => {
  if (!date) {
    return 'Recently listed';
  }

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Recently listed';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  }).format(parsedDate);
};

const hashString = (value: string) =>
  Array.from(value).reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);

const getMarketplaceImage = (
  item: MarketplaceItemResponse,
  category: Asset['category']
) => {
  const imagePool =
    item.itemType === 'source_code'
      ? [IMAGE_SEED_MAP.drift, IMAGE_SEED_MAP.planner, IMAGE_SEED_MAP.tycoon]
      : {
          'Shaders & VFX': [IMAGE_SEED_MAP.interior, IMAGE_SEED_MAP.sky],
          '2D Assets': [IMAGE_SEED_MAP.forest, IMAGE_SEED_MAP.interior],
          '3D Models': [IMAGE_SEED_MAP.knight, IMAGE_SEED_MAP.char],
          'Audio & SFX': [IMAGE_SEED_MAP.char, IMAGE_SEED_MAP.sky],
          'Scripts & Plugins': [IMAGE_SEED_MAP.planner, IMAGE_SEED_MAP.tycoon]
        }[category];

  return imagePool[Math.abs(hashString(item.id)) % imagePool.length];
};

const buildMarketplaceTagList = (
  item: MarketplaceItemResponse,
  category: Asset['category']
) => [
  item.itemType === 'source_code' ? 'Source Code' : 'Asset Pack',
  category,
  item.godotVersion,
  item.sourceGameTitle,
  item.githubVerifiedAt ? 'GitHub Verified' : undefined,
  item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : undefined
].filter((tag): tag is string => Boolean(tag));

const mapMarketplaceItemToAsset = (item: MarketplaceItemResponse): Asset => {
  const category = normalizeMarketplaceCategory(item.categoryName, item.itemType);
  const dbTags = item.tags || [];
  const tagList = dbTags.length > 0 ? dbTags : buildMarketplaceTagList(item, category);

  return {
    id: item.id,
    title: item.title,
    price: Number(item.price || 0),
    rating: item.itemType === 'source_code' ? 4.9 : 4.8,
    reviewedCount: 0,
    author: item.sellerFullName || item.sellerEmail || 'Unknown Creator',
    authorAvatar: DEFAULT_AUTHOR_AVATAR,
    category,
    description: item.description || '',
    image: item.thumbnailUrl || getMarketplaceImage(item, category),
    tag: item.godotVersion || category,
    tagList,
    itemType: item.itemType,
    version: item.version || (item.itemType === 'source_code' ? (item.godotVersion || '1.0.0') : '1.0.0'),
    screenshots: item.screenshots || [],
    videoUrl: item.videoUrl,
    license: item.license || 'MIT',
    licenseTerms: item.licenseTerms,
    documentation: item.documentation || '',
    supportedPlatforms: item.supportedPlatforms || '',
    lastUpdated: formatMarketplaceDate(item.updatedAt || item.createdAt),
    details: {
      tilesCount: item.itemType === 'source_code' ? 'Complete project bundle' : 'Pack archive',
      spritesCount: item.itemType === 'source_code'
        ? (item.sourceGameTitle || 'Standalone source package')
        : 'Ready-to-import resources',
      propsCount: item.githubVerifiedAt ? 'GitHub-verified package' : 'Marketplace file package',
      featuresList: item.itemType === 'source_code'
        ? [
            'Real marketplace source listing from API',
            item.githubVerifiedAt ? 'GitHub repository verified before publishing' : 'Direct source package download',
            item.godotVersion ? `Built for ${item.godotVersion}` : 'Compatible Godot project structure'
          ]
        : [
            'Real marketplace asset listing from API',
            'Ready for import into your production pipeline',
            category ? `${category} category mapping preserved` : 'Category metadata preserved'
          ]
    }
  };
};

const INITIAL_ASSETS: Asset[] = [
  {
    id: 'cyber_interior',
    title: 'Cyberpunk Interior Kit',
    price: 250000,
    rating: 4.9,
    reviewedCount: 82,
    author: 'NeoArtisans',
    authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80',
    category: 'Shaders & VFX',
    description: 'An immersive cyberpunk-themed modular tile and lighting template setup. Includes custom particle glows, neon emissive shaders, modular desk modules, database control desks, and clean grid integration parameters. Pre-configured for Godot Engine lights and shadows optimization.',
    image: IMAGE_SEED_MAP.interior,
    tag: 'Cyberpunk, 2D, Modular, Sci-Fi',
    tagList: ['Tileset', '2D', 'Emissive Shaders', 'Godot 4', 'Sci-Fi'],
    itemType: 'asset',
    isBestseller: true,
    version: '1.2.0',
    lastUpdated: 'May 14, 2026',
    details: {
      tilesCount: '120+ Tiles (16x16 / 32x32)',
      spritesCount: '15 Interactive Animated Sprites',
      propsCount: '45 Retro Props & Terminal Objects',
      featuresList: [
        'Dynamic Godot tile map setup',
        'Custom light reflection layer',
        'Pre-coded simple door & monitor functions',
        'Highly optimized draw calls'
      ]
    }
  },
  {
    id: 'neon_drift',
    title: 'Neon Drift 2088 Project Template',
    price: 120000,
    rating: 4.8,
    reviewedCount: 142,
    author: 'OctaneGames',
    authorAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=80&h=80&q=80',
    category: 'Scripts & Plugins',
    description: 'A complete arcade racer structure using Godot VehicleBody3D nodes. Features modular drift handling logic, nitro injection formulas, waypoint AI racers, and a cyberpunk neon visual palette.',
    image: IMAGE_SEED_MAP.drift,
    tag: 'Templates, 3D, Drift, Physics',
    tagList: ['Templates', '3D', 'Physics', 'Godot 4.x', 'Racing'],
    itemType: 'source_code',
    isBestseller: true,
    version: '2.0.1',
    lastUpdated: 'Jan 22, 2026',
    details: {
      tilesCount: 'N/A (3D Scene)',
      spritesCount: '4 High Performance Cars',
      propsCount: '45 Modular Track Prefabs',
      featuresList: [
        'Advanced slip-angle physics model',
        'Optimized viewport split screen configs',
        'Fully documented steering wheel controls'
      ]
    }
  },
  {
    id: 'pixel_planner',
    title: 'Pixel Planner Simulation Framework',
    price: 0,
    rating: 4.6,
    reviewedCount: 310,
    author: 'LofiDev',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&h=80&q=80',
    category: 'Scripts & Plugins',
    description: 'A ready-made system designed to manage simulation grids, build pathways, and spawn modular citizens. Perfect for starting top-down cozy city builders or farm simulation games.',
    image: IMAGE_SEED_MAP.planner,
    tag: '2D, Grid, Simulation, Free',
    tagList: ['Frameworks', 'Cozy', 'Simulation', 'Godot 4.x', 'A-Star Pathfinding'],
    itemType: 'source_code',
    version: '0.9.8',
    lastUpdated: 'Apr 02, 2026',
    details: {
      tilesCount: '64 Tile Variants',
      spritesCount: '12 Cozy Anim States',
      propsCount: '20 Simple Obstacles',
      featuresList: [
        'Efficient A* pathfinding server implementation',
        'Auto-indexing terrain decorator rules',
        'Custom local storage save state hooks'
      ]
    }
  },
  {
    id: 'void_knight',
    title: 'Void Knight 3D Character Model Pack',
    price: 150000,
    rating: 4.9,
    reviewedCount: 54,
    author: 'VoidSmithed',
    authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=80&h=80&q=80',
    category: '3D Models',
    description: 'A high-fidelity low-poly stylized character rigged and optimized for game engines. Features dark magical emission layers, modular weaponry specs, and 24 AAA game-ready animations.',
    image: IMAGE_SEED_MAP.knight,
    tag: 'Characters, 3D, Rigged, Fantasy',
    tagList: ['Characters', 'Stylized', '3D Scene', 'Rigged', 'Fantasy'],
    itemType: 'asset',
    version: '1.0.0',
    lastUpdated: 'Feb 10, 2026',
    details: {
      tilesCount: 'N/A',
      spritesCount: '1 Customizable Mesh',
      propsCount: '6 Modular Weapon Models',
      featuresList: [
        'Rigged with industry-standard joints',
        'Low poly count (~8.5k tris)',
        'Includes source .blend and ready GLTF formats'
      ]
    }
  },
  {
    id: 'metro_tycoon',
    title: 'Metro Tycoon Management Kit',
    price: 200000,
    rating: 4.7,
    reviewedCount: 95,
    author: 'StrategyLab',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&h=80&q=80',
    category: 'Scripts & Plugins',
    description: 'An extensive isometric strategy kit comprising economy balancing formulas, track editing scripts, path logic routing, and expandable statistics widgets for high gameplay immersion.',
    image: IMAGE_SEED_MAP.tycoon,
    tag: 'Strategy, UI, Economy, Grid',
    tagList: ['Strategy', 'UI & Elements', 'Grid Systems', 'Simulating', 'Godot 4'],
    itemType: 'source_code',
    version: '1.5.0',
    lastUpdated: 'Mar 18, 2026',
    details: {
      tilesCount: '40 Train track combinations',
      spritesCount: '6 animated commuter vehicles',
      propsCount: '15 Station assets',
      featuresList: [
        'Advanced finance-tracking calculations',
        'Custom modular pop-up panels',
        'Localized language CSV file support'
      ]
    }
  },
  {
    id: 'dynamic_sky',
    title: 'Stylized Dynamic Sky & Ocean System',
    price: 300000,
    rating: 5.0,
    reviewedCount: 61,
    author: 'GlowFlow',
    authorAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=80&h=80&q=80',
    category: 'Shaders & VFX',
    description: 'A stellar interactive skybox shader with Day/Night cycles, physical cloud scattering layers, and customized responsive ocean waves parameters to scale visual limits.',
    image: IMAGE_SEED_MAP.sky,
    tag: 'Shaders, Dynamic, Sky, Water',
    tagList: ['Shaders', 'Skybox', 'Weather System', '3D Scene', 'Godot 4.x'],
    itemType: 'asset',
    isBestseller: true,
    version: '2.1.0',
    lastUpdated: 'Jun 01, 2026',
    details: {
      tilesCount: 'N/A',
      spritesCount: 'N/A',
      propsCount: 'N/A',
      featuresList: [
        'Dynamic day-night ambient light synchronization',
        'Custom noise-driven storm cloud generators',
        'Stunning light scattering water shader'
      ]
    }
  },
  {
    id: 'forest_lush',
    title: 'Lush Forest 2D Cozy Tileset',
    price: 90000,
    rating: 4.5,
    reviewedCount: 28,
    author: 'NaturePixel',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&h=80&q=80',
    category: '2D Assets',
    description: 'A beautiful organic nature environment set. Includes trees, water shader presets, rock varieties, flowers, and modular cliffs to build immersive RPG forest scenarios.',
    image: IMAGE_SEED_MAP.forest,
    tag: '2D, Tileset, Forest, RPG',
    tagList: ['Tileset', '2D Assets', 'Modular Forest', 'RPG', '16x16 Grid'],
    itemType: 'asset',
    version: '1.0.3',
    lastUpdated: 'May 20, 2026',
    details: {
      tilesCount: '250+ Hand-painted tiles',
      spritesCount: '5 Ambient Wildlife Anims',
      propsCount: '30 Organic Scene Modifiers',
      featuresList: [
        'Pre-configured collision layers in Godot 4.3',
        'Layered parallax forest backgrounds (5 layers)',
        'Fully sliceable tile atlas maps'
      ]
    }
  },
  {
    id: 'retro_sfx',
    title: 'Retro Arcade SFX Sound Anthology',
    price: 80000,
    rating: 4.7,
    reviewedCount: 89,
    author: 'LofiDev',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&h=80&q=80',
    category: 'Audio & SFX',
    description: 'An retro synthesizer archive of over 450 vintage sound effects. Ideal for shooters, platformers, UI transitions, level completes, lasers, and explosions.',
    image: IMAGE_SEED_MAP.char, 
    tag: 'Audio, Sound Effects, Retro, Synthesizer',
    tagList: ['Audio', 'Chiptune FX', '16-bit', 'Vaporwave', 'Godot Ready'],
    itemType: 'asset',
    version: '1.4.0',
    lastUpdated: 'Apr 11, 2026',
    details: {
      tilesCount: 'N/A',
      spritesCount: '15 Audio Mix Tracks',
      propsCount: '450 WAV & MP3 Tracks',
      featuresList: [
        'High quality lossless 44.1kHz standards',
        'Seamless dynamic ambient loop capabilities',
        'Optimized for rapid memory playback pipelines'
      ]
    }
  }
];

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
  if (screen === 'payment-failed') return '/payment/failed';
  if (screen === 'payment-cancelled') return '/payment/cancelled';
  if (screen === 'wallet') return '/wallet';
  return `/${screen}`;
};

export default function App() {
  const initialRoute = pathToScreen(window.location.pathname);
  const [currentScreen, setCurrentScreen] = useState<ScreenType>(initialRoute.screen);
  const { currentUser, logout } = useAuth();
  const { setActiveRecipientId, setActiveRecipientDetails } = useWebSocket();
  const setCurrentUser = (user: User | null) => {
    if (user === null) {
      logout();
    }
  };
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'warning' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  // Clear active chat recipient when leaving chat screen
  useEffect(() => {
    if (currentScreen !== 'chat') {
      setActiveRecipientId(null);
      setActiveRecipientDetails(null);
    }
  }, [currentScreen, setActiveRecipientId, setActiveRecipientDetails]);

  const [selectedAssetId, setSelectedAssetId] = useState<string>(initialRoute.assetId || 'cyber_interior');
  const [selectedPost, setSelectedPost] = useState<CommunityChatResponse | null>(null);
  const [selectedAuthor, setSelectedAuthor] = useState<UserSummary | null>(null);
  const [searchText, setSearchText] = useState<string>('');
  
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [godotVersion, setGodotVersion] = useState<string>('All Versions');
  const [maxPrice, setMaxPrice] = useState<number>(2000000);
  const [sortOrder, setSortOrder] = useState<'popular' | 'price-low' | 'price-high'>('popular');

  const [cart, setCart] = useState<Asset[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [paymentOrders, setPaymentOrders] = useState<PaymentResponse[]>(() => readStoredPayments());
  const [selectedPaymentOrderId, setSelectedPaymentOrderId] = useState<string | null>(() => readStoredSelectedPaymentOrder());
  const [isPlacingOrder, setIsPlacingOrder] = useState<boolean>(false);
  const [isRefreshingPayments, setIsRefreshingPayments] = useState<boolean>(false);
  const [financeStats, setFinanceStats] = useState({
    totalRevenue: 12500000,
    activePlayers: 485,
    listedCount: 8
  });

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
    author: game.creatorName || 'Unknown Creator',
    authorAvatar: DEFAULT_AUTHOR_AVATAR,
    category: (game.categoryName || 'Scripts & Plugins') as any,
    description: game.description || '',
    image: game.thumbnailUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    tag: game.publishingType ? `Publishing: ${game.publishingType}` : 'Game',
    tagList: [game.publishingType || 'Marketplace', game.status || 'Published'],
    version: '1.0.0',
    lastUpdated: 'Just now',
    details: {
      tilesCount: 'N/A',
      spritesCount: 'Included',
      propsCount: 'Editable',
      featuresList: ['Premium Godot game project', 'Verified clean and safe source code']
    },
    screenshots: game.screenshots,
    videoUrl: game.videoUrl
  });

  useEffect(() => {
    let isCancelled = false;

    const fetchActiveMarketplaceItems = async () => {
      try {
        const res = await marketplaceApi.getAllMarketplaceItems('active');
        if (!res.success || !res.data || isCancelled) {
          return;
        }

        const mapped = res.data.map(mapMarketplaceItemToAsset);
        setAssets(prev => {
          const nonMarketplaceCatalog = prev.filter(item => !item.itemType);
          return [...mapped, ...nonMarketplaceCatalog];
        });
      } catch (err) {
        console.error('Failed to load marketplace items from backend:', err);
      }
    };

    if (currentScreen === 'marketplace' || currentScreen === 'explore' || currentScreen === 'detail') {
      fetchActiveMarketplaceItems();
    }

    return () => {
      isCancelled = true;
    };
  }, [currentScreen]);

  // Fetch published games from backend S3
  useEffect(() => {
    const fetchPublishedGames = async () => {
      try {
        const res = await gameApi.getAllGames('published');
        if (res.success && res.data) {
          const mapped = res.data.map(mapGameToAsset);
          setAssets(prev => {
            const filteredPrev = prev.filter(item => !mapped.some(m => m.id === item.id));
            return [...mapped, ...filteredPrev];
          });
        }
      } catch (err) {
        console.error("Failed to load published games from backend:", err);
      }
    };
    if (currentScreen === 'marketplace' || currentScreen === 'explore') {
      fetchPublishedGames();
    }
  }, [currentScreen]);

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
      showToast(`Mua hàng thành công: ${payment.marketplaceItemTitle}.`, 'success');
      return;
    }

    if (payment.paymentStatus === 'FAILED') {
      showToast(`Thanh toán thất bại cho ${payment.marketplaceItemTitle}.`, 'error');
      return;
    }

    if (payment.paymentStatus === 'CANCELLED' || variant === 'cancelled') {
      showToast(`Bạn đã hủy thanh toán cho ${payment.marketplaceItemTitle}.`, 'warning');
      return;
    }

    if (payment.paymentStatus === 'EXPIRED') {
      showToast(`Phiên thanh toán cho ${payment.marketplaceItemTitle} đã hết hạn.`, 'warning');
      return;
    }

    if (variant === 'success') {
      showToast(`Đơn hàng ${payment.marketplaceItemTitle} đang chờ PayOS xác nhận.`, 'info');
      return;
    }

    if (variant === 'failed') {
      showToast(`Thanh toán cho ${payment.marketplaceItemTitle} chưa hoàn tất.`, 'error');
    }
  }, [showToast]);

  // Switch to Detail Screen helper
  const handleViewAssetDetails = (asset: Asset) => {
    setSelectedAssetId(asset.id);
    setSelectedThumbIndex(0);
    setCurrentScreen('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Switch to Marketplace with Category pre-selected helper
  const handleCategoryClick = (category: string) => {
    setSelectedCategories([category]);
    setCurrentScreen('marketplace');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Add Item to Cart
  const handleAddToCart = (asset: Asset, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUser) {
      showToast("Bạn cần đăng nhập để thêm sản phẩm vào giỏ hàng!", "warning");
      setCurrentScreen('signin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setCart(prev => {
      if (prev.some(item => item.id === asset.id)) {
        return prev;
      }
      return [...prev, asset];
    });
    setIsCartOpen(true);
  };

  // Remove Item from Cart
  const handleRemoveFromCart = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleBuyNow = (asset: Asset) => {
    if (!currentUser) {
      showToast("Bạn cần đăng nhập để mua hàng!", "warning");
      setCurrentScreen('signin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!asset.itemType) {
      showToast("Chỉ marketplace item mới hỗ trợ luồng thanh toán mới ở thời điểm hiện tại.", "warning");
      return;
    }

    setCart(prev => {
      if (prev.some(item => item.id === asset.id)) {
        return prev;
      }
      return [...prev, asset];
    });
    setIsCartOpen(false);
    setCurrentScreen('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Navigate to checkout instead of simulating an immediate completed purchase
  const handleCheckout = () => {
    if (!currentUser) {
      showToast("Bạn cần đăng nhập để mua hàng!", "warning");
      setCurrentScreen('signin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (cart.length === 0) {
      showToast("Giỏ hàng của bạn đang trống.", "info");
      return;
    }

    setIsCartOpen(false);
    setCurrentScreen('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
          throw new Error(historyResponse.message || 'Không thể tải danh sách thanh toán của bạn.');
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
            throw new Error(response.message || 'Không thể tải trạng thái thanh toán.');
          }
          return response.data;
        })
      );

      replaceTrackedPayments(refreshedPayments, selectedPaymentOrderId);
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Không thể làm mới trạng thái thanh toán.', 'error');
    } finally {
      setIsRefreshingPayments(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!currentUser) {
      showToast("Bạn cần đăng nhập để mua hàng!", "warning");
      setCurrentScreen('signin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (cart.length === 0) {
      showToast("Giỏ hàng của bạn đang trống.", "info");
      return;
    }

    const unsupportedItems = cart.filter((item) => !item.itemType);
    if (unsupportedItems.length > 0) {
      showToast("Giỏ hàng đang có item chưa thuộc marketplace payment flow. Vui lòng xóa chúng trước khi checkout.", "warning");
      return;
    }

    if (cart.length > 1) {
      showToast("Luồng PayOS hiện tại đang hỗ trợ 1 marketplace item cho mỗi checkout session. Bạn hãy giữ lại 1 item trong giỏ trước khi thanh toán.", "warning");
      return;
    }

    const nonPersistedMarketplaceItems = cart.filter((item) => !UUID_PATTERN.test(item.id));
    if (nonPersistedMarketplaceItems.length > 0) {
      showToast("Một số sản phẩm đang là dữ liệu demo cũ, chưa có record thật trong database nên chưa thể tạo payment.", "warning");
      return;
    }

    setIsPlacingOrder(true);
    try {
      const checkoutItem = cart[0];
      const response = await paymentApi.createPayment({ marketplaceItemId: checkoutItem.id });
      if (!response.success || !response.data) {
        throw new Error(response.message || `Không thể tạo đơn thanh toán cho ${checkoutItem.title}.`);
      }

      const createdPayment = response.data;
      syncTrackedPayment(createdPayment);
      setCart([]);
      setIsCartOpen(false);

      if (createdPayment.paymentStatus === 'PAID' || !createdPayment.checkoutUrl) {
        setCurrentScreen('payment');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast("Đơn hàng đã sẵn sàng. Bạn có thể theo dõi trạng thái và tải file trong Payment Center.", "success");
        return;
      }

      window.location.href = createdPayment.checkoutUrl;
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Không thể tạo PayOS checkout session.', 'error');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleCancelPayment = async (paymentId: string) => {
    try {
      const response = await paymentApi.cancelPayment(paymentId);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Không thể hủy payment session.');
      }

      syncTrackedPayment(response.data);
      showToast("Payment session đã được hủy.", "success");
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Không thể hủy payment session.', 'error');
      throw err;
    }
  };

  // Community Actions for Detail Screen
  const handleReactToPost = (postId: string, type: ReactionType) => {
    setSelectedPost(prev => {
      if (!prev || prev.id !== postId) return prev;
      const prevReaction = prev.currentUserReaction;
      const isToggleOff = prevReaction === type;
      
      const newReaction = isToggleOff ? undefined : type;
      
      return {
        ...prev,
        currentUserReaction: newReaction
      };
    });
  };

  const handleSharePost = async (postId: string) => {
    const shareMessage = window.prompt("Giới thiệu bài đăng được chia sẻ này (tùy chọn):");
    if (shareMessage === null) return;
    try {
      await communityApi.sharePost(postId, { message: shareMessage });
      showToast("Chia sẻ bài viết thành công!", "success");
    } catch (err: any) {
      showToast(err.response?.data?.message || "Không thể chia sẻ bài viết", "error");
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bài viết này không?")) return;
    try {
      await communityApi.deletePost(postId);
      showToast("Xóa bài viết thành công!", "success");
      setCurrentScreen('community');
    } catch (err: any) {
      showToast(err.response?.data?.message || "Không thể xóa bài viết", "error");
    }
  };



  const marketplaceCatalogAssets = useMemo(
    () => assets.filter((item): item is Asset & { itemType: 'source_code' | 'asset' } => Boolean(item.itemType)),
    [assets]
  );

  // Filter & Sort Logic for Marketplace
  const filteredAssets = useMemo(() => {
    return marketplaceCatalogAssets.filter(item => {
      // Search Box Filter
      if (searchText) {
        const matchesSearch = item.title.toLowerCase().includes(searchText.toLowerCase()) || 
                              item.description.toLowerCase().includes(searchText.toLowerCase()) ||
                              item.tag.toLowerCase().includes(searchText.toLowerCase());
        if (!matchesSearch) return false;
      }
      
      // Category Checkboxes Filter
      if (selectedCategories.length > 0) {
        if (!selectedCategories.includes(item.category)) return false;
      }

      // Max price filter 
      if (item.price > maxPrice) return false;

      return true;
    }).sort((a, b) => {
      if (sortOrder === 'price-low') return a.price - b.price;
      if (sortOrder === 'price-high') return b.price - a.price;
      return b.rating - a.rating; // default standard popularity index
    });
  }, [marketplaceCatalogAssets, searchText, selectedCategories, maxPrice, sortOrder]);

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
  const projectRepositories = [
    { id: '1', projectName: 'Skyward Chronicles Engine', version: 'v4.1.2', date: 'Just now', status: 'LIVE' as const, engine: 'Godot 4.1-Stable', downloads: '12.4k' },
    { id: '2', projectName: 'Neon Drift Mechanics Module', version: 'v2.0.1', date: '3 hours ago', status: 'LIVE' as const, engine: 'Godot 4.2-Dev3', downloads: '3.1k' },
    { id: '3', projectName: 'Retro Platformer Pro Controller', version: 'v1.4.0', date: 'Yesterday', status: 'BETA' as const, engine: 'Godot 3.5 LTS', downloads: '890' },
    { id: '4', projectName: 'Isometric Combat Pathfinder', version: 'v0.9.8-Beta', date: 'Last week', status: 'BETA' as const, engine: 'Godot 4.x-Beta', downloads: '1,420' },
    { id: '5', projectName: 'Procedural Terrain Generator', version: 'v0.2.1-Alpha', date: 'May 10', status: 'ALPHA' as const, engine: 'Godot 4.3', downloads: '112' }
  ];

  return (
    <div id="godotlaunch-root" className={`${darkMode ? 'dark bg-transparent text-slate-100' : 'bg-transparent text-slate-800'} min-h-screen flex flex-col font-sans transition-colors duration-300 relative`}>
      
      {/* 3D Voxel Nature Environment Background */}
      <img 
        id="voxel-background-layer"
        src={VOXEL_BG_IMAGE}
        alt="Voxel Background Scenery"
        className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none transition-all duration-700" 
        style={{ 
          filter: darkMode ? 'brightness(0.4) contrast(1.1) saturate(1.12)' : 'brightness(0.98) contrast(1.0) saturate(1.0)'
        }}
        referrerPolicy="no-referrer"
      />

      {/* Gradient light/dark overlay tint */}
      <div 
        id="voxel-background-tint"
        className="fixed inset-0 z-[1] pointer-events-none transition-all duration-700 bg-gradient-to-b from-white/5 via-white/10 to-white/20 dark:from-slate-950/20 dark:via-slate-950/35 dark:to-slate-950/50"
      />

      {/* Decorative ambient pixel dot overlay layer */}
      <div className="fixed inset-0 pointer-events-none pixel-grid-overlay z-[2]"></div>

      {/* HEADER SECTION */}
      {currentScreen === 'admin' ? (
        <AdminHeader
          setCurrentScreen={setCurrentScreen}
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
      ) : (
        <Header
          currentScreen={currentScreen}
          setCurrentScreen={setCurrentScreen}
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          searchText={searchText}
          setSearchText={setSearchText}
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
          showToast={showToast}
        />
      )}

      {/* PRIMARY VIEWS SWITCHER WITH STUNNING ACCENTUATIONS */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10 flex-grow">
        
        {currentScreen === 'explore' && (
          <HomePage
            assets={assets}
            setCurrentScreen={setCurrentScreen}
            handleCategoryClick={handleCategoryClick}
            handleViewAssetDetails={handleViewAssetDetails}
            handleAddToCart={handleAddToCart}
          />
        )}

        {currentScreen === 'marketplace' && (
          <MarketplacePage
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
          />
        )}

        {currentScreen === 'checkout' && (
          <ProtectedRoute setCurrentScreen={setCurrentScreen}>
            <CheckoutPage
              cart={cart}
              isPlacingOrder={isPlacingOrder}
              onBackToMarketplace={() => {
                setCurrentScreen('marketplace');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onPlaceOrder={handlePlaceOrder}
              onRemoveItem={(id) => handleRemoveFromCart(id)}
            />
          </ProtectedRoute>
        )}

        {currentScreen === 'payment' && (
          <ProtectedRoute setCurrentScreen={setCurrentScreen}>
            <PaymentDetailPage
              payments={paymentOrders}
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

        {currentScreen === 'detail' && focusedAsset && (
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
          />
        )}

        {currentScreen === 'upload' && (
          <ProtectedRoute setCurrentScreen={setCurrentScreen}>
            <UploadPage setCurrentScreen={setCurrentScreen} />
          </ProtectedRoute>
        )}

        {currentScreen === 'path' && (
          <PathPage
            setCurrentScreen={setCurrentScreen}
          />
        )}

        {currentScreen === 'dashboard' && (
          <ProtectedRoute setCurrentScreen={setCurrentScreen}>
            <DashboardPage
              currentUser={currentUser}
              financeStats={financeStats}
              assets={assets}
              projectRepositories={projectRepositories}
              purchasedPayments={paymentOrders}
              setCurrentScreen={setCurrentScreen}
            />
          </ProtectedRoute>
        )}

        {currentScreen === 'wallet' && (
          <ProtectedRoute setCurrentScreen={setCurrentScreen}>
            <WalletPage setCurrentScreen={setCurrentScreen} />
          </ProtectedRoute>
        )}

        {currentScreen === 'community' && (
          <CommunityPage
            darkMode={darkMode}
            setCurrentScreen={setCurrentScreen}
            onViewPostDetails={(post) => {
              setSelectedPost(post);
              setSelectedAssetId(post.id);
              setCurrentScreen('community-detail');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onViewAuthorProfile={(author) => {
              setSelectedAuthor(author);
              setSelectedAssetId(author.id);
              setCurrentScreen('author-profile');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentScreen === 'community-detail' && (
          <CommunityDetailScreen
            post={selectedPost || undefined}
            postId={selectedAssetId}
            onNavigateBack={() => {
              setCurrentScreen('community');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateToProfile={(author) => {
              setSelectedAuthor(author);
              setSelectedAssetId(author.id);
              setCurrentScreen('author-profile');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onReact={handleReactToPost}
            onShare={handleSharePost}
            onDelete={handleDeletePost}
          />
        )}

        {currentScreen === 'author-profile' && (
          <ProfileScreen
            author={selectedAuthor || undefined}
            authorId={selectedAssetId}
            onNavigateBack={() => {
              setCurrentScreen('community');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onViewPostDetails={(post) => {
              setSelectedPost(post);
              setSelectedAssetId(post.id);
              setCurrentScreen('community-detail');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onMessageCreator={(recipient) => {
              setSelectedAuthor(recipient);
              setSelectedAssetId(recipient.id);
              setActiveRecipientId(recipient.id);
              setCurrentScreen('chat');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentScreen === 'chat' && (
          <ProtectedRoute setCurrentScreen={setCurrentScreen}>
            <ChatScreen />
          </ProtectedRoute>
        )}

        {currentScreen === 'signin' && (
          <SignInPage
            setCurrentScreen={setCurrentScreen}
            setCurrentUser={setCurrentUser}
          />
        )}

        {currentScreen === 'signup' && (
          <SignUpPage
            setCurrentScreen={setCurrentScreen}
            setCurrentUser={setCurrentUser}
          />
        )}

        {currentScreen === 'auth-callback' && (
          <GitHubCallbackPage
            setCurrentScreen={setCurrentScreen}
            setCurrentUser={setCurrentUser}
          />
        )}

        {currentScreen === 'admin' && (
          <ProtectedRoute setCurrentScreen={setCurrentScreen} requiredRole="admin">
            <AdminPage
              setCurrentScreen={setCurrentScreen}
              currentUser={currentUser}
            />
          </ProtectedRoute>
        )}

        {currentScreen === 'profile' && (
          <ProtectedRoute setCurrentScreen={setCurrentScreen}>
            <ProfilePage />
          </ProtectedRoute>
        )}

      </main>

      {/* FOOTER ACCENTS SECTION */}
      <Footer setCurrentScreen={setCurrentScreen} />

      {/* Toast Notifications */}
      {toast && (
        <div 
          className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 max-w-md p-4 rounded-xl shadow-2xl border backdrop-blur-md animate-toast-in transition-all duration-300"
          style={{
            backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.85)',
            borderColor: toast.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 
                         toast.type === 'warning' ? 'rgba(245, 158, 11, 0.3)' : 
                         toast.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(56, 189, 248, 0.3)'
          }}
        >
          <div className="flex-shrink-0">
            {toast.type === 'success' && <CheckCircle className="text-emerald-500 w-5 h-5" />}
            {toast.type === 'warning' && <AlertTriangle className="text-amber-500 w-5 h-5 animate-pulse" />}
            {toast.type === 'error' && <ShieldAlert className="text-rose-500 w-5 h-5" />}
            {toast.type === 'info' && <Info className="text-sky-500 w-5 h-5" />}
          </div>
          <div className="flex-grow text-xs sm:text-sm font-semibold tracking-wide pr-2">
            <span className={darkMode ? 'text-slate-200' : 'text-slate-800'}>
              {toast.message}
            </span>
          </div>
          <button 
            onClick={() => setToast(null)}
            className="flex-shrink-0 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-100/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
}
