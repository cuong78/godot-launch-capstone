import React, { useState, useEffect } from "react";
import SideNavBar from "../components/DevPortal/SideNavBar";
import { Outlet, useNavigate } from "react-router-dom";
import { useLanguage } from "../hooks/useLanguage";
import {
  Terminal,
  Cpu,
  LineChart,
  ShieldCheck,
  ArrowRight,
  Loader2,
  FileText,
  Sparkles,
} from "lucide-react";

const localTranslations = {
  en: {
    title: "JOIN THE INDIE_CORE DEVS",
    subtitle: "ENGINE_RESOURCES & GAME_DISTRIBUTION PORTAL",
    zeroCutTitle: "Zero-Cut Distribution",
    zeroCutDesc:
      "Keep 100% of your earnings. No corporate algorithms or heavy commissions.",
    godotTitle: "Deep Godot Integration",
    godotDesc:
      "Seamlessly deploy Godot engine builds directly to our global decentralized network.",
    analyticsTitle: "Developer Analytics",
    analyticsDesc:
      "Access global telemetry, real-time downloads, and active-player logstreams.",
    notLoggedIn: "AUTHENTICATE ID CORE",
    notLoggedInDesc:
      "You must be signed in to synchronize with the developer network.",
    loggedInPlayer: "ACTIVATE DEVELOPER PROFILE",
    loggedInPlayerDesc:
      "Upgrade your player account to gain instant access to developer resources.",
    policyTitle: "Developer Network Directive",
    policy1:
      "1. Developers must distribute original works developed or compiled using supported open-source engines.",
    policy2:
      "2. The platform operates on a 0% commission basis. All transactions are directly processed via Indie Core nodes.",
    policy3:
      "3. Developers retain full IP rights and telemetry management for all published software archives.",
    upgradingLink: "INITIALIZING ENGINE_PORTAL LINK...",
    upgradingBuild: "ALLOCATING CLOUD BUILD RESOURCE KEYS...",
    upgradingIdentity: "UPGRADING NEURAL IDENTITY CORE TO [DEVELOPER]...",
    success: "UPGRADE COMPLETE! SYNCHRONIZING PORTAL...",
  },
  vi: {
    title: "GIA NHẬP ĐỘI NGŨ INDIE_CORE DEVS",
    subtitle: "CỔNG PHÂN PHỐI GAME & TÀI NGUYÊN ENGINE",
    zeroCutTitle: "Phân phối 0% Hoa hồng",
    zeroCutDesc:
      "Giữ lại 100% doanh thu của bạn. Không có thuật toán tập đoàn hay chiết khấu nặng nề.",
    godotTitle: "Tích hợp sâu Godot Engine",
    godotDesc:
      "Triển khai các bản build Godot trực tiếp lên mạng lưới phi tập trung toàn cầu của chúng tôi.",
    analyticsTitle: "Phân tích & Thống kê",
    analyticsDesc:
      "Truy cập dữ liệu đo lường toàn cầu, lượt tải thời gian thực và luồng nhật ký người chơi.",
    notLoggedIn: "ĐĂNG NHẬP NHẬN DẠNG",
    notLoggedInDesc:
      "Bạn cần đăng nhập để đồng bộ hóa với mạng lưới nhà phát triển.",
    loggedInPlayer: "KÍCH HOẠT QUYỀN NHÀ PHÁT TRIỂN",
    loggedInPlayerDesc:
      "Nâng cấp tài khoản người chơi của bạn để truy cập ngay lập tức vào tài nguyên của Dev.",
    policyTitle: "Chỉ thị mạng lưới Nhà phát triển",
    policy1:
      "1. Nhà phát triển phải phân phối các sản phẩm nguyên bản được phát triển hoặc biên dịch bằng công cụ mã nguồn mở.",
    policy2:
      "2. Nền tảng hoạt động trên cơ sở 0% hoa hồng. Mọi giao dịch được xử lý trực tiếp qua các node Indie Core.",
    policy3:
      "3. Nhà phát triển giữ toàn bộ quyền sở hữu trí tuệ và quản lý dữ liệu đối với các tệp lưu trữ phần mềm đã xuất bản.",
    upgradingLink: "ĐANG KHỞI TẠO LIÊN KẾT ENGINE_PORTAL...",
    upgradingBuild: "ĐANG CẤP PHÁT KHÓA TÀI NGUYÊN BUILD ĐÁM MÂY...",
    upgradingIdentity: "ĐANG NÂNG CẤP NHÂN DẠNG HỆ THỐNG LÊN [DEVELOPER]...",
    success: "NÂNG CẤP THÀNH CÔNG! ĐANG ĐỒNG BỘ CỔNG...",
  },
  ja: {
    title: "INDIE_CORE DEVS への参加",
    subtitle: "ゲーム配信＆エンジンリソースポータル",
    zeroCutTitle: "手数料 0% 配信",
    zeroCutDesc:
      "収益の100%を手元に。企業のアルゴリズムや重い手数料は一切ありません。",
    godotTitle: "Godot エンジンの深い統合",
    godotDesc:
      "Godotエンジンのビルドをグローバルな分散型ネットワークに直接デプロイします。",
    analyticsTitle: "開発者向けアナリティクス",
    analyticsDesc:
      "グローバルテレメトリ、リアルタイムダウンロード、アクティブプレイヤーのログストリームにアクセス。",
    notLoggedIn: "IDコアの認証",
    notLoggedInDesc:
      "開発者ネットワークと同期するには、サインインする必要があります。",
    loggedInPlayer: "開発者プロファイルの有効化",
    loggedInPlayerDesc:
      "プレイヤーアカウントをアップグレードして、開発者リソースに即座にアクセスします。",
    policyTitle: "開発者ネットワーク指令",
    policy1:
      "1. 開発者は、サポートされているオープンソースエンジンを使用して開発またはコンパイルされたオリジナル作品を配信する必要があります。",
    policy2:
      "2. プラットフォームは手数料0%で動作します。すべての取引はIndie Coreノードを介して直接処理されます。",
    policy3:
      "3. 開発者は、公開されたすべてのソフトウェアアーカイブの完全な知的財産権とテレメトリ管理を保持します。",
    upgradingLink: "ENGINE_PORTAL リンクを初期化中...",
    upgradingBuild: "クラウドビルドリソースキーを割り当て中...",
    upgradingIdentity: "システムIDを [DEVELOPER] にアップグレード中...",
    success: "アップグレード完了！ポータルを同期中...",
  },
};

export default function DevPortal() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const localT = localTranslations[language] || localTranslations.en;

  const [user, setUser] = useState(null);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeStep, setUpgradeStep] = useState(0);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  const handleUpgrade = () => {
    setUpgrading(true);
    setUpgradeStep(1);

    // Simulated cyberpunk upgrade process steps
    setTimeout(() => {
      setUpgradeStep(2);
      setTimeout(() => {
        setUpgradeStep(3);
        setTimeout(() => {
          setUpgradeStep(4);
          setTimeout(() => {
            // Commit user role changes
            const userStr = localStorage.getItem("user");
            if (userStr) {
              const currentUser = JSON.parse(userStr);
              const updatedUser = { ...currentUser, roleName: "developer" };
              localStorage.setItem("user", JSON.stringify(updatedUser));
              setUser(updatedUser);

              // Trigger navbar custom state upgrade if listening
              window.dispatchEvent(new Event("storage"));
            }
            setUpgrading(false);
            setUpgradeStep(0);
          }, 1000);
        }, 1200);
      }, 1200);
    }, 1200);
  };

  const isDevOrAdmin =
    user &&
    (user.roleName.toLowerCase() === "developer" ||
      user.roleName.toLowerCase() === "admin");

  if (isDevOrAdmin) {
    return (
      <div className="flex flex-1 w-full max-w-container-max mx-auto overflow-hidden relative">
        <SideNavBar />
        <Outlet />
      </div>
    );
  }

  return (
    <main className="flex-grow flex items-center justify-center relative px-margin-mobile md:px-margin-desktop py-24 min-h-screen">
      {/* Ambient Background Glows */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-primary-container/5 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-secondary-container/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="glass-panel w-full max-w-5xl rounded-lg border border-white/10 p-8 md:p-12 shadow-[0_0_40px_rgba(0,0,0,0.5)] relative overflow-hidden z-10 flex flex-col gap-10">
        {/* Scanline effect */}
        <div className="absolute inset-0 scanline pointer-events-none opacity-20"></div>

        {/* Title Block */}
        <div className="space-y-3 text-center relative z-20">
          <h1 className="font-headline-lg text-3xl md:text-5xl text-primary-container uppercase tracking-tight drop-shadow-[0_0_12px_rgba(0,242,255,0.4)]">
            {localT.title}
          </h1>
          <p className="font-label-sm text-sm text-on-surface-variant uppercase tracking-[0.25em]">
            {localT.subtitle}
          </p>
        </div>

        {/* Perks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-20">
          <div className="p-6 bg-surface-container-low/40 border border-outline-variant/20 rounded-lg hover:border-primary-container/30 hover:bg-surface-container-low/60 transition-all group flex flex-col gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-container/10 border border-primary-container/30 flex items-center justify-center text-primary-container group-hover:scale-110 transition-transform">
              <Terminal className="w-6 h-6" />
            </div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface uppercase tracking-wide">
              {localT.zeroCutTitle}
            </h3>
            <p className="font-body-md text-sm text-on-surface-variant/70 leading-relaxed">
              {localT.zeroCutDesc}
            </p>
          </div>

          <div className="p-6 bg-surface-container-low/40 border border-outline-variant/20 rounded-lg hover:border-primary-container/30 hover:bg-surface-container-low/60 transition-all group flex flex-col gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-container/10 border border-primary-container/30 flex items-center justify-center text-primary-container group-hover:scale-110 transition-transform">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface uppercase tracking-wide">
              {localT.godotTitle}
            </h3>
            <p className="font-body-md text-sm text-on-surface-variant/70 leading-relaxed">
              {localT.godotDesc}
            </p>
          </div>

          <div className="p-6 bg-surface-container-low/40 border border-outline-variant/20 rounded-lg hover:border-primary-container/30 hover:bg-surface-container-low/60 transition-all group flex flex-col gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-container/10 border border-primary-container/30 flex items-center justify-center text-primary-container group-hover:scale-110 transition-transform">
              <LineChart className="w-6 h-6" />
            </div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface uppercase tracking-wide">
              {localT.analyticsTitle}
            </h3>
            <p className="font-body-md text-sm text-on-surface-variant/70 leading-relaxed">
              {localT.analyticsDesc}
            </p>
          </div>
        </div>

        {/* Policy Section */}
        <div className="p-6 bg-black/40 border border-white/5 rounded-lg relative z-20 font-mono text-xs text-on-surface-variant/80 space-y-4 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3 text-secondary uppercase tracking-widest">
            <FileText className="w-4 h-4" />
            <span>{localT.policyTitle}</span>
          </div>
          <div className="space-y-3 leading-relaxed">
            <p>{localT.policy1}</p>
            <p>{localT.policy2}</p>
            <p>{localT.policy3}</p>
          </div>
        </div>

        {/* Actions panel */}
        <div className="flex flex-col items-center gap-4 relative z-20 border-t border-white/10 pt-8 mt-2">
          {!user ? (
            <>
              <button
                onClick={() => navigate("/login")}
                className="w-full max-w-sm py-4 bg-primary-container text-on-primary-fixed font-headline-md text-headline-md uppercase tracking-widest rounded-lg hover:shadow-[0_0_25px_rgba(0,242,255,0.6)] active:scale-[0.98] transition-all relative overflow-hidden group cursor-pointer flex items-center justify-center gap-2"
              >
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.1)_50%,transparent_50%)] bg-[length:100%_4px] pointer-events-none opacity-20"></div>
                <span>{localT.notLoggedIn}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <p className="text-[10px] uppercase font-mono tracking-widest text-on-surface-variant/40">
                {localT.notLoggedInDesc}
              </p>
            </>
          ) : (
            <>
              <button
                onClick={handleUpgrade}
                className="w-full max-w-sm py-4 bg-secondary-container text-on-secondary-fixed font-headline-md text-headline-md uppercase tracking-widest rounded-lg hover:shadow-[0_0_25px_rgba(180,100,255,0.6)] active:scale-[0.98] transition-all relative overflow-hidden group cursor-pointer flex items-center justify-center gap-2"
              >
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.1)_50%,transparent_50%)] bg-[length:100%_4px] pointer-events-none opacity-20"></div>
                <Sparkles className="w-5 h-5 text-secondary" />
                <span>{localT.loggedInPlayer}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <p className="text-[10px] uppercase font-mono tracking-widest text-on-surface-variant/40">
                {localT.loggedInPlayerDesc}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Futuristic simulated loading/upgrading console modal overlay */}
      {upgrading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
          <div className="glass-panel w-full max-w-lg rounded-lg border border-primary-container/30 p-6 shadow-[0_0_50px_rgba(0,242,255,0.2)] flex flex-col gap-6 relative overflow-hidden font-mono">
            <div className="absolute inset-0 scanline pointer-events-none opacity-25"></div>

            <div className="flex items-center justify-between border-b border-primary-container/20 pb-3">
              <span className="text-xs text-primary-container uppercase tracking-widest flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                GLITCH_CONSOLE_v3.4.1
              </span>
              <span className="text-[10px] text-on-surface-variant/40 uppercase">
                sec_link_established
              </span>
            </div>

            <div className="space-y-3 text-xs min-h-[140px] flex flex-col justify-end">
              {upgradeStep >= 1 && (
                <div className="space-y-1">
                  <p className="text-secondary">
                    &gt; [OK] local_link::connect_to("indie_core_network")
                  </p>
                  <p className="text-on-surface/80">{localT.upgradingLink}</p>
                </div>
              )}
              {upgradeStep >= 2 && (
                <div className="space-y-1">
                  <p className="text-secondary">
                    &gt; [OK] cloud_builder::allocate_resources()
                  </p>
                  <p className="text-on-surface/80">{localT.upgradingBuild}</p>
                </div>
              )}
              {upgradeStep >= 3 && (
                <div className="space-y-1">
                  <p className="text-secondary">
                    &gt; [OK]
                    neural_identity::upgrade_permission(ROLE_DEVELOPER)
                  </p>
                  <p className="text-on-surface/80">
                    {localT.upgradingIdentity}
                  </p>
                </div>
              )}
              {upgradeStep >= 4 && (
                <div className="space-y-1 border-t border-primary-container/20 pt-2 mt-2">
                  <p className="text-primary-container font-bold flex items-center gap-1.5 animate-pulse">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    &gt; {localT.success}
                  </p>
                </div>
              )}
            </div>

            <div className="w-full bg-surface-container-lowest h-1.5 rounded-full overflow-hidden relative">
              <div
                className="bg-primary-container h-full transition-all duration-1000 ease-out"
                style={{ width: `${(upgradeStep / 4) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
