import React, { useEffect, useState } from 'react';
import { Check, Github, ScanFace, FileText, Sparkles, Loader2, CreditCard, ClipboardCheck, ArrowLeft, ArrowRight, LogOut, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/Button';
import { FaceVerifyModal } from '../components/FaceVerifyModal';
import KycOcrModal from '../components/KycOcrModal';
import { BecomeDeveloperLanding } from '../components/BecomeDeveloperLanding';
import { userApi } from '../api/userApi';
import { authApi } from '../api/authApi';
import { faceVerifyApi } from '../api/faceVerifyApi';
import { kycApi } from '../api/kycApi';
import { useAuth } from '../hooks/useAuth';
import { ScreenType } from '../types';

interface DeveloperOnboardingPageProps {
  setCurrentScreen: (screen: ScreenType) => void;
}

const BANK_OPTIONS = [
  "Vietcombank",
  "BIDV",
  "VietinBank",
  "Agribank",
  "Techcombank",
  "MBBank",
  "ACB",
  "Sacombank",
  "VPBank",
  "TPBank",
  "OCB",
  "SHB",
  "HDBank"
];

const AGREEMENT_TEXT = `CHƯƠNG TRÌNH PHÂN PHỐI SẢN PHẨM TRÊN GODOTLAUNCH
Cập nhật lần cuối: Tháng 7, 2026

Chào mừng bạn đến với chương trình phân phối trên Marketplace của GodotLaunch. Thoả thuận này quy định các điều khoản pháp lý giữa bạn (Developer) và nền tảng GodotLaunch liên quan đến việc xuất bản, phân phối và bán mã nguồn (source code), tài nguyên đồ hoạ (assets) hoặc bất kỳ sản phẩm nào khác của bạn.

ĐIỀU 1: ĐIỀU KHOẢN CHUNG & PHẠM VI ÁP DỤNG
1.1. Bằng cách chọn hộp đồng ý và tiếp tục quá trình đăng ký, bạn xác nhận rằng bạn đã đọc, hiểu và đồng ý bị ràng buộc bởi các điều khoản của thoả thuận này.
1.2. Bạn cam kết sở hữu đầy đủ quyền sở hữu trí tuệ hoặc có quyền phân phối hợp pháp đối với mọi sản phẩm được đăng tải.

ĐIỀU 2: CHIA SẺ DOANH THU & PHÍ NỀN TẢNG
2.1. Tỉ lệ chia sẻ doanh thu mặc định dành cho Developer là 88% giá trị giao dịch thành công thực tế (sau khi trừ thuế và phí thanh toán phát sinh bên ngoài).
2.2. Nền tảng GodotLaunch sẽ nhận phí vận hành 12% trừ trực tiếp trên mỗi giao dịch. Tỉ lệ này có thể thay đổi tùy theo các chương trình Co-publishing hoặc các hợp đồng đặc thù riêng biệt.

ĐIỀU 3: BẢO MẬT & BẢN QUYỀN
3.1. Developer cam kết tuyệt đối không đăng tải các mã nguồn hoặc tài nguyên chứa mã độc, nội dung vi phạm bản quyền phần mềm khác, hoặc vi phạm thuần phong mỹ tục.
3.2. Mọi khiếu nại hoặc tranh chấp liên quan đến việc sao chép ý tưởng, đạo văn sẽ được xử lý qua hệ thống Plagiarism Detection phối hợp cùng Ban Quản Trị GodotLaunch.

ĐIỀU 4: THANH TOÁN & HOÀN TIỀN (PAYOUT)
4.1. Tiền bán hàng sẽ được tích lũy vào Ví điện tử nội bộ trên GodotLaunch.
4.2. Developer chỉ được phép thực hiện yêu cầu rút tiền (Withdrawal) về tài khoản ngân hàng chính chủ đã liên kết thành công ở bước Payout Setup.
4.3. Nền tảng hỗ trợ thanh toán thông qua cổng PayOS an toàn. Quy trình kiểm duyệt rút tiền tối qua là 3 ngày làm việc.`;

export const DeveloperOnboardingPage: React.FC<DeveloperOnboardingPageProps> = ({ setCurrentScreen }) => {
  const { currentUser, updateUser } = useAuth();
  
  // Trạng thái các bước xác minh
  const [githubLinked, setGithubLinked] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);
  const [kycVerified, setKycVerified] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [payoutSaved, setPayoutSaved] = useState(false);

  // Trạng thái chung
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [hasInitialNavigated, setHasInitialNavigated] = useState(false);

  // Modals & Forms
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [showKycModal, setShowKycModal] = useState(false);
  const [isLinkingGithub, setIsLinkingGithub] = useState(false);
  const [isSavingPayout, setIsSavingPayout] = useState(false);

  // Payout bank form
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');

  const loadStatus = async () => {
    setIsLoadingStatus(true);
    setError(null);
    try {
      const [githubRes, faceRes, kycRes] = await Promise.allSettled([
        userApi.getGitHubStatus(),
        faceVerifyApi.getStatus(),
        kycApi.getStatus(),
      ]);

      const linked =
        githubRes.status === 'fulfilled' && githubRes.value.success && githubRes.value.data
          ? githubRes.value.data.linked
          : false;
      const faceOk =
        faceRes.status === 'fulfilled' && faceRes.value.success && faceRes.value.data
          ? faceRes.value.data.faceVerified
          : false;
      const kycOk =
        kycRes.status === 'fulfilled' && kycRes.value.success && kycRes.value.data
          ? kycRes.value.data.kycVerified
          : false;

      setGithubLinked(linked);
      setFaceVerified(faceOk);
      setKycVerified(kycOk);

      const hasBank = !!currentUser?.bankName && !!currentUser?.bankAccount;
      setPayoutSaved(hasBank);

      // Nếu đã có tiến độ, tự nhận diện đồng ý điều khoản
      if (linked || faceOk || kycOk || hasBank) {
        setAgreementAccepted(true);
        setHasStarted(true);
      }

      if (githubRes.status === 'rejected') {
        const err = githubRes.reason;
        setError(err?.response?.data?.message || err?.message || 'Không thể tải trạng thái xác minh.');
      }
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Đồng bộ hóa thông tin ngân hàng từ user profile
  useEffect(() => {
    if (currentUser) {
      if (currentUser.bankName) setBankName(currentUser.bankName);
      if (currentUser.bankAccount) setBankAccount(currentUser.bankAccount);
      if (currentUser.bankAccountHolder) setBankAccountHolder(currentUser.bankAccountHolder);
      if (currentUser.bankName && currentUser.bankAccount) {
        setPayoutSaved(true);
      }
    }
  }, [currentUser]);

  // Điều hướng thông minh đến bước chưa hoàn thành (Chỉ chạy 1 lần khi load status xong)
  useEffect(() => {
    if (!isLoadingStatus && hasStarted && !hasInitialNavigated) {
      if (!agreementAccepted) {
        setActiveStep(1);
      } else if (!githubLinked) {
        setActiveStep(2);
      } else if (!faceVerified) {
        setActiveStep(3);
      } else if (!kycVerified) {
        setActiveStep(4);
      } else if (!payoutSaved) {
        setActiveStep(5);
      }
      setHasInitialNavigated(true);
    }
  }, [isLoadingStatus, hasStarted, agreementAccepted, githubLinked, faceVerified, kycVerified, payoutSaved, hasInitialNavigated]);

  const handleLinkGitHub = async () => {
    setIsLinkingGithub(true);
    setError(null);
    try {
      const res = await authApi.prepareLink();
      if (res.success && res.data?.redirectUrl) {
        localStorage.setItem('github_link_pending', 'true');
        window.location.href = res.data.redirectUrl;
      } else {
        setError(res.message || 'Không thể bắt đầu liên kết GitHub.');
        setIsLinkingGithub(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Không thể bắt đầu liên kết GitHub.');
      setIsLinkingGithub(false);
    }
  };

  const handleSavePayout = async () => {
    if (!bankName.trim() || !bankAccount.trim() || !bankAccountHolder.trim()) {
      setError('Vui lòng điền đầy đủ thông tin tài khoản ngân hàng.');
      return;
    }
    setIsSavingPayout(true);
    setError(null);
    try {
      const res = await userApi.updateProfile({
        fullName: currentUser?.fullName || '',
        bankName: bankName.trim(),
        bankAccount: bankAccount.trim(),
        bankAccountHolder: bankAccountHolder.trim(),
      });
      if (res.success && res.data) {
        setPayoutSaved(true);
        updateUser(res.data);
      } else {
        setError(res.message || 'Không thể lưu thông tin payout.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Lỗi khi lưu thông tin payout.');
    } finally {
      setIsSavingPayout(false);
    }
  };

  const isDeveloper = currentUser?.role === 'developer' || currentUser?.role === 'admin';
  const allDone = githubLinked && faceVerified && kycVerified && payoutSaved;

  const showLanding = !isLoadingStatus && !hasStarted && !allDone;

  // Cấu hình các bước để render progress bar
  const stepConfigs = [
    { id: 1, name: 'Agreement', done: agreementAccepted, label: 'Thoả thuận' },
    { id: 2, name: 'GitHub', done: githubLinked, label: 'GitHub' },
    { id: 3, name: 'FaceID', done: faceVerified, label: 'Xác thực mặt' },
    { id: 4, name: 'KYC', done: kycVerified, label: 'Giấy tờ KYC' },
    { id: 5, name: 'Payout', done: payoutSaved, label: 'Payout Setup' },
  ];

  // Kiểm tra điều kiện có thể click "Next"
  const isStepCompleted = (step: number) => {
    switch (step) {
      case 1: return agreementAccepted;
      case 2: return githubLinked;
      case 3: return faceVerified;
      case 4: return kycVerified;
      case 5: return payoutSaved;
      default: return false;
    }
  };

  if (isLoadingStatus) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3 bg-[#0c0c0e] text-slate-400">
        <Loader2 size={36} className="animate-spin text-amber-500" />
        <p className="text-sm font-semibold tracking-wide">Đang tải trạng thái onboarding...</p>
      </div>
    );
  }

  if (showLanding) {
    return <BecomeDeveloperLanding onGetStarted={() => { setHasStarted(true); }} />;
  }

  return (
    <div className="min-h-screen bg-[#0c0c0e] py-10 px-4 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl animate-fade-in">
        
        {/* PROGRESS BAR (Giao diện giống FAB Unreal Engine) */}
        <div className="relative mb-12 flex justify-between items-center rounded-2xl border border-white/5 bg-[#121214] p-6 shadow-2xl">
          {stepConfigs.map((step, idx) => {
            const isCompleted = step.done;
            const isActive = activeStep === step.id;
            const isPrevCompleted = idx === 0 || stepConfigs[idx - 1].done;

            return (
              <React.Fragment key={step.id}>
                {/* Dây nối */}
                {idx > 0 && (
                  <div className="relative flex-1 h-0.5 mx-2 bg-slate-800">
                    <div
                      className={`absolute left-0 top-0 h-full transition-all duration-300 ${
                        isCompleted || (isActive && isPrevCompleted) ? 'bg-lime-500 w-full' : 'bg-slate-800 w-0'
                      }`}
                    />
                  </div>
                )}
                
                {/* Nút giai đoạn */}
                <div
                  className="flex flex-col items-center cursor-pointer group"
                  onClick={() => {
                    if (step.id <= activeStep || stepConfigs[step.id - 2]?.done) {
                      setActiveStep(step.id);
                    }
                  }}
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                      isCompleted
                        ? 'bg-lime-500 text-[#0c0c0e]'
                        : isActive
                        ? 'bg-amber-500 text-[#0c0c0e] ring-4 ring-amber-500/20'
                        : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
                    }`}
                  >
                    {isCompleted ? <Check size={18} strokeWidth={3} /> : step.id}
                  </div>
                  <span
                    className={`mt-2 text-[11px] font-semibold tracking-wider uppercase transition-all duration-300 ${
                      isCompleted
                        ? 'text-lime-500'
                        : isActive
                        ? 'text-amber-500'
                        : 'text-slate-500 group-hover:text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* CONTAINER NỘI DUNG CHÍNH */}
        <div className="relative min-h-[420px] rounded-3xl border border-white/5 bg-[#121214] p-8 shadow-3xl">
          {error && (
            <div className="mb-6 rounded-xl border border-rose-900/50 bg-rose-950/20 p-4 text-sm text-rose-400">
              {error}
            </div>
          )}

          {allDone ? (
            /* HOÀN TẤT THÀNH CÔNG */
            <div className="flex flex-col items-center justify-center py-10 text-center animate-fade-in">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-lime-500/10 text-lime-500">
                <Sparkles size={40} />
              </div>
              <h2 className="mt-6 font-display text-2xl font-black tracking-tight text-white">
                Chúc mừng, bạn đã là Developer!
              </h2>
              <p className="mt-3 max-w-md text-sm text-slate-400">
                Bạn đã hoàn tất tất cả các khâu xác minh danh tính và thiết lập thanh toán. Bây giờ bạn có thể tự do đăng bán game và assets trên GodotLaunch.
              </p>
              <Button variant="primary" size="lg" className="mt-8 bg-lime-500 hover:bg-lime-400 text-black font-bold" onClick={() => setCurrentScreen('dashboard')}>
                Đi tới Dashboard
              </Button>
            </div>
          ) : (
            /* NỘI DUNG CHI TIẾT TỪNG BƯỚC */
            <div className="animate-fade-in">
              {/* STEP 1: AGREEMENT */}
              {activeStep === 1 && (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">Bước 1</span>
                    <h2 className="text-2xl font-black text-white">Thỏa Thuận Phân Phối</h2>
                    <p className="text-sm text-slate-400">Vui lòng đọc kĩ và xác nhận các điều khoản phân phối trên Marketplace.</p>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-black/40 p-4">
                    <div className="max-h-56 overflow-y-auto pr-2 text-xs leading-relaxed text-slate-400 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                      {AGREEMENT_TEXT.split('\n\n').map((para, i) => (
                        <p key={i} className="mb-3">{para}</p>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-start gap-3 rounded-xl border border-white/5 bg-slate-900/30 p-4 cursor-pointer hover:bg-slate-900/50 transition">
                    <input
                      type="checkbox"
                      checked={agreementAccepted}
                      onChange={(e) => setAgreementAccepted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500"
                    />
                    <div className="text-xs text-slate-300">
                      Tôi đồng ý với các điều khoản phân phối trên Marketplace của GodotLaunch. Tôi cam đoan chịu trách nhiệm pháp lý đối với toàn bộ nội dung mà mình đăng tải.
                    </div>
                  </label>
                </div>
              )}

              {/* STEP 2: LINK GITHUB */}
              {activeStep === 2 && (
                <div className="space-y-6 text-center py-6">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">Bước 2</span>
                    <h2 className="text-2xl font-black text-white">Liên Kết GitHub</h2>
                    <p className="text-sm text-slate-400">Đồng bộ kho mã nguồn của bạn để quản lý và cấp quyền phân phối source code tự động.</p>
                  </div>

                  {githubLinked ? (
                    <div className="mx-auto max-w-md rounded-2xl border border-lime-900/50 bg-lime-950/15 p-6 flex flex-col items-center gap-3 animate-fade-in">
                      <CheckCircle2 className="w-12 h-12 text-lime-500" />
                      <div className="text-sm font-semibold text-lime-400">Đã liên kết GitHub thành công</div>
                      <div className="text-xs text-slate-400">Bạn đã sẵn sàng để tích hợp kho code của mình lên hệ thống.</div>
                    </div>
                  ) : (
                    <div className="mx-auto max-w-md space-y-4">
                      <div className="flex justify-center">
                        <div className="rounded-full bg-slate-900 p-6 border border-white/5">
                          <Github className="w-16 h-16 text-white" />
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 px-4">
                        Chúng tôi sẽ yêu cầu quyền truy cập cơ bản để kiểm tra mã nguồn trò chơi của bạn khi bạn tạo các build đăng bán.
                      </p>
                      <Button
                        variant="primary"
                        className="bg-white hover:bg-slate-200 text-black font-bold flex items-center justify-center gap-2 mx-auto"
                        onClick={handleLinkGitHub}
                        disabled={isLinkingGithub}
                      >
                        {isLinkingGithub ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Đang chuyển hướng...
                          </>
                        ) : (
                          <>
                            <Github size={18} /> Liên kết tài khoản GitHub
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: FACEID */}
              {activeStep === 3 && (
                <div className="space-y-6 text-center py-6">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">Bước 3</span>
                    <h2 className="text-2xl font-black text-white">Xác Thực Khuôn Mặt (FaceID)</h2>
                    <p className="text-sm text-slate-400">Xác thực trắc sinh học một lần duy nhất để chống nạn nhân bản tài khoản hàng loạt.</p>
                  </div>

                  {faceVerified ? (
                    <div className="mx-auto max-w-md rounded-2xl border border-lime-900/50 bg-lime-950/15 p-6 flex flex-col items-center gap-3 animate-fade-in">
                      <CheckCircle2 className="w-12 h-12 text-lime-500" />
                      <div className="text-sm font-semibold text-lime-400">Xác thực FaceID thành công</div>
                      <div className="text-xs text-slate-400">Dữ liệu sinh trắc học đã được mã hóa an toàn ở lớp cơ sở dữ liệu vector.</div>
                    </div>
                  ) : (
                    <div className="mx-auto max-w-md space-y-4">
                      <div className="flex justify-center">
                        <div className="rounded-full bg-slate-900 p-6 border border-white/5">
                          <ScanFace className="w-16 h-16 text-amber-500" />
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 px-4">
                        Chúng tôi quét khuôn mặt của bạn để đối chiếu xem bạn có sử dụng nhiều tài khoản trái phép để thao túng đánh giá hay không.
                      </p>
                      <Button
                        variant="primary"
                        className="bg-amber-500 hover:bg-amber-400 text-black font-bold flex items-center justify-center gap-2 mx-auto"
                        onClick={() => setShowFaceModal(true)}
                      >
                        <ScanFace size={18} /> Bắt đầu quét khuôn mặt
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: KYC */}
              {activeStep === 4 && (
                <div className="space-y-6 text-center py-6">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">Bước 4</span>
                    <h2 className="text-2xl font-black text-white">Xác Minh Danh Tính (KYC)</h2>
                    <p className="text-sm text-slate-400">Tải lên tài liệu tùy thân để nhận diện pháp lý khi phát sinh doanh thu lớn.</p>
                  </div>

                  {kycVerified ? (
                    <div className="mx-auto max-w-md rounded-2xl border border-lime-900/50 bg-lime-950/15 p-6 flex flex-col items-center gap-3 animate-fade-in">
                      <CheckCircle2 className="w-12 h-12 text-lime-500" />
                      <div className="text-sm font-semibold text-lime-400">Xác minh danh tính KYC thành công</div>
                      <div className="text-xs text-slate-400">Họ tên và số giấy tờ của bạn đã được đối soát chính xác với cơ sở dữ liệu.</div>
                    </div>
                  ) : (
                    <div className="mx-auto max-w-md space-y-4">
                      <div className="flex justify-center">
                        <div className="rounded-full bg-slate-900 p-6 border border-white/5">
                          <FileText className="w-16 h-16 text-amber-500" />
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 px-4">
                        Vui lòng tải lên ảnh chụp mặt trước và mặt sau của CCCD hoặc Hộ chiếu. Hệ thống sẽ tự động quét thông tin OCR của bạn.
                      </p>
                      <Button
                        variant="primary"
                        className="bg-amber-500 hover:bg-amber-400 text-black font-bold flex items-center justify-center gap-2 mx-auto"
                        onClick={() => setShowKycModal(true)}
                      >
                        <FileText size={18} /> Bắt đầu tải lên giấy tờ
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 5: PAYOUT SETUP */}
              {activeStep === 5 && (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">Bước 5</span>
                    <h2 className="text-2xl font-black text-white">Thiết Lập Tài Khoản Payout</h2>
                    <p className="text-sm text-slate-400">Thông tin ngân hàng này sẽ được lưu để tự động điền khi bạn yêu cầu rút tiền bán hàng sau này.</p>
                  </div>

                  <div className="space-y-4 max-w-xl mx-auto rounded-2xl border border-white/5 bg-[#0a0a0c] p-6">
                    <div>
                      <label className="text-white/50 text-xs mb-1 block">Tên Ngân Hàng *</label>
                      <select
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-amber-400/60"
                      >
                        <option value="" disabled className="bg-[#0c0c0e] text-slate-400">-- Chọn Ngân Hàng --</option>
                        {BANK_OPTIONS.map((bank) => (
                          <option key={bank} value={bank} className="bg-[#0c0c0e] text-white">{bank}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-white/50 text-xs mb-1 block">Số Tài Khoản *</label>
                      <input
                        type="text"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        placeholder="Ví dụ: 19034567890123"
                        className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-amber-400/60"
                      />
                    </div>

                    <div>
                      <label className="text-white/50 text-xs mb-1 block">Tên Chủ Tài Khoản (Viết hoa không dấu) *</label>
                      <input
                        type="text"
                        value={bankAccountHolder}
                        onChange={(e) => setBankAccountHolder(e.target.value.toUpperCase())}
                        placeholder="Ví dụ: NGUYEN VAN A"
                        className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-amber-400/60"
                      />
                    </div>

                    {payoutSaved ? (
                      <div className="rounded-xl border border-lime-900/50 bg-lime-950/20 px-4 py-3 text-xs text-lime-400 font-semibold flex items-center gap-2 animate-fade-in">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Thông tin thanh toán đã được thiết lập thành công.</span>
                      </div>
                    ) : (
                      <Button
                        variant="primary"
                        onClick={handleSavePayout}
                        disabled={isSavingPayout}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold flex items-center justify-center gap-2"
                      >
                        {isSavingPayout ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...
                          </>
                        ) : (
                          <>
                            <CreditCard size={18} /> Lưu thông tin Payout
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM NAVIGATION BAR */}
        {!allDone && (
          <div className="mt-8 flex justify-between items-center rounded-2xl border border-white/5 bg-[#121214] p-5 shadow-2xl animate-fade-in">
            <button
              onClick={() => setCurrentScreen('explore')}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition flex items-center gap-2 text-sm font-semibold"
            >
              <LogOut size={16} /> Thoát
            </button>

            <div className="flex gap-3">
              <button
                disabled={activeStep === 1}
                onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
                className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-semibold"
              >
                <ArrowLeft size={16} /> Quay lại
              </button>

              <button
                disabled={!isStepCompleted(activeStep) || activeStep === 5}
                onClick={() => setActiveStep((prev) => Math.min(5, prev + 1))}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-extrabold shadow-lg shadow-amber-500/10"
              >
                Tiếp tục <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* MODALS */}
      {showFaceModal && (
        <FaceVerifyModal
          onSuccess={() => {
            setShowFaceModal(false);
            loadStatus();
            setActiveStep(4);
          }}
          onClose={() => setShowFaceModal(false)}
          description="Xác thực sinh trắc học khuôn mặt là điều kiện bắt buộc giúp bảo vệ quyền sở hữu và uy tín phân phối trên GodotLaunch."
          successMessage="Tuyệt vời! Tiếp tục sang bước kế tiếp..."
        />
      )}

      {showKycModal && (
        <KycOcrModal
          onSuccess={() => {
            setShowKycModal(false);
            loadStatus();
            setActiveStep(5);
          }}
          onClose={() => setShowKycModal(false)}
          subtitle="Xác minh danh tính Tier 2"
          successDescription="Thông tin tài liệu đã ghi nhận thành công..."
        />
      )}
    </div>
  );
};
