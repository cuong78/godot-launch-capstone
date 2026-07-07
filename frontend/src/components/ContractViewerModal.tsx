import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Download, PenTool, CheckCircle, Clock, ShieldCheck, XCircle, AlertTriangle } from 'lucide-react';
import { ContractResponse, User } from '../types';
import { SignaturePad } from './SignaturePad';
import { Button } from './Button';
import { Input } from './Input';
import KycOcrModal from './KycOcrModal';
import { kycApi } from '../api/kycApi';

interface ContractViewerModalProps {
  contract: ContractResponse;
  currentUser: User | null;
  onClose: () => void;
  // If provided, the modal will allow signing
  mode?: 'view' | 'sign-developer';
  onSignSuccess?: () => void;
  // Callbacks for API integration inside the modal
  onSignDeveloper?: (signatureBase64: string, rep: string, addr: string, tax: string) => Promise<{ success: boolean; message?: string }>;
  onRejectDeveloper?: (rejectionReason: string) => Promise<{ success: boolean; message?: string }>;
}

export const ContractViewerModal: React.FC<ContractViewerModalProps> = ({
  contract,
  currentUser,
  onClose,
  mode = 'view',
  onSignSuccess,
  onSignDeveloper,
  onRejectDeveloper
}) => {
  // Developer signing states
  const [sellerRepresentative, setSellerRepresentative] = useState(contract.sellerRepresentative || currentUser?.fullName || '');
  const [sellerAddress, setSellerAddress] = useState(contract.sellerAddress || '');
  const [sellerTaxCode, setSellerTaxCode] = useState(contract.sellerTaxCode || '');
  const [devSignature, setDevSignature] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [rejectType, setRejectType] = useState<'cancel' | 'negotiate'>('negotiate');

  // KYC gate: check on mount when developer needs to sign
  const [showKycModal, setShowKycModal] = useState(false);

  useEffect(() => {
    if (mode !== 'sign-developer' || contract.signedAtSeller) return;
    kycApi.getStatus().then((res) => {
      if (res.success && res.data) {
        if (!res.data.kycVerified) {
          setShowKycModal(true);
        } else {
          // Auto-fill from stored KYC if fields are empty
          if (!sellerRepresentative && res.data.fullName) setSellerRepresentative(res.data.fullName);
          if (!sellerAddress && res.data.address) setSellerAddress(res.data.address);
        }
      }
    }).catch(() => {
      // KYC check failed — allow signing anyway (fail-open)
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stepper helper
  const getStepStatus = (step: 1 | 2) => {
    if (step === 1) {
      return contract.signedAtBuyer ? 'completed' : 'active';
    }
    if (step === 2) {
      if (contract.signedAtSeller) return 'completed';
      return contract.signedAtBuyer ? 'active' : 'upcoming';
    }
    return 'upcoming';
  };

  const handleDevSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSignDeveloper || !devSignature) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await onSignDeveloper(devSignature, sellerRepresentative, sellerAddress, sellerTaxCode);
      if (res.success) {
        if (onSignSuccess) onSignSuccess();
      } else {
        setErrorMsg(res.message || 'Lỗi ký hợp đồng');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDevReject = async () => {
    if (!onRejectDeveloper) return;
    if (!rejectionReasonInput.trim()) {
      alert("Vui lòng điền lý do từ chối hợp đồng!");
      return;
    }
    
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const formattedReason = rejectType === 'cancel'
        ? `[HỦY HỢP ĐỒNG] ${rejectionReasonInput.trim()}`
        : `[THƯƠNG LƯỢNG] ${rejectionReasonInput.trim()}`;
      const res = await onRejectDeveloper(formattedReason);
      if (res.success) {
        if (onSignSuccess) onSignSuccess();
      } else {
        setErrorMsg(res.message || 'Lỗi từ chối hợp đồng');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (showKycModal) {
    return createPortal(
      <KycOcrModal
        onSuccess={({ fullName, address }) => {
          if (fullName) setSellerRepresentative(fullName);
          if (address) setSellerAddress(address);
          setShowKycModal(false);
        }}
        onClose={onClose}
      />,
      document.body
    );
  }

  return createPortal(
    <div className="contract-modal-overlay fixed inset-0 z-[99999] flex justify-center items-start bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="contract-modal-box bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl w-full max-w-5xl my-8 flex flex-col relative animate-fade-in">
        
        {/* Header toolbar */}
        <div className="contract-header-toolbar flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-widest text-sky-500 dark:text-sky-400 uppercase font-bold">
                E-CONTRACT SYSTEM
              </span>
              {(() => {
                const getStatusInfo = (status: string) => {
                  switch (status) {
                    case 'signed':
                      return { text: 'Đã ký / Signed', colorClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
                    case 'cancelled':
                      return { text: 'Đã hủy / Cancelled', colorClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20' };
                    case 'expired':
                      return { text: 'Hết hạn / Expired', colorClass: 'bg-slate-500/10 text-slate-550 border-slate-500/20' };
                    case 'pending':
                    default:
                      return { text: 'Chờ Developer ký / Pending', colorClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse' };
                  }
                };
                const statusInfo = getStatusInfo(contract.status);
                return (
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider font-mono border ${statusInfo.colorClass}`}>
                    {statusInfo.text}
                  </span>
                );
              })()}
            </div>
            <h2 className="font-display font-bold text-lg text-slate-800 dark:text-white mt-1">
              Hợp đồng phát hành: {contract.gameTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mã số: GL-{contract.id?.substring(0, 8).toUpperCase()}/HĐPH • Tạo ngày: {new Date(contract.createdAt).toLocaleDateString()}
            </p>
          </div>
          <button 
            className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {/* Stepper Progress bar */}
        <div className="contract-stepper-bar grid grid-cols-2 gap-4 mb-6 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-850">
          {[
            { step: 1, title: 'Admin ký tên', desc: contract.signedAtBuyer ? `Đã ký lúc ${new Date(contract.signedAtBuyer).toLocaleDateString()}` : 'Chờ Admin ký', icon: <PenTool size={16} /> },
            { step: 2, title: 'Developer ký đối ứng', desc: contract.signedAtSeller ? `Đã ký lúc ${new Date(contract.signedAtSeller).toLocaleDateString()}` : 'Đang chờ ký đối ứng', icon: <ShieldCheck size={16} /> }
          ].map((item) => {
            const status = getStepStatus(item.step as 1 | 2);
            return (
              <div key={item.step} className="flex items-start gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${
                  status === 'completed' 
                    ? 'bg-emerald-500/10 text-emerald-500' 
                    : status === 'active' 
                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30' 
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                }`}>
                  {status === 'completed' ? <CheckCircle size={16} /> : item.icon}
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-slate-750 dark:text-slate-200">{item.title}</span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{item.desc}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Split Panels */}
        <div className="contract-split-panels grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Panel: A4 Document Viewer */}
          <div className="contract-left-panel lg:col-span-7 flex flex-col gap-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
                Bản xem trước hợp đồng (PDF Preview)
              </span>
              <button 
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-xs transition-studio cursor-pointer"
                title="Tải xuống hợp đồng dạng PDF"
              >
                <Download size={14} /> Tải file PDF
              </button>
            </div>
            
            {/* The Document Box (simulated white A4 paper sheet) */}
            <div 
              id="contract-print-area"
              className="p-8 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-800 rounded-xl max-h-[70vh] overflow-y-auto leading-relaxed space-y-5 shadow-inner select-text"
              style={{ fontFamily: "'Times New Roman', Times, Baskerville, Georgia, serif", fontSize: '13px' }}
            >
              
              {/* Document Header */}
              <div className="flex justify-between items-start border-b border-slate-300 dark:border-slate-800 pb-4 text-xs">
                <div className="text-center w-[48%] font-bold">
                  CÔNG TY CỔ PHẦN GODOT LAUNCH
                  <div className="mt-1 font-mono font-normal">Số: GL-{contract.id?.substring(0, 8).toUpperCase()}/HĐPH</div>
                </div>
                <div className="text-center w-[48%] font-bold">
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  <span className="text-[11px] block font-semibold mt-0.5">Độc lập - Tự do - Hạnh phúc</span>
                  <div className="w-24 h-[1px] bg-slate-900 dark:bg-slate-300 mx-auto mt-1"></div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center py-2">
                <div className="text-base font-bold uppercase tracking-wide">HỢP ĐỒNG PHÁT HÀNH PHẦN MỀM</div>
              </div>

              {/* Preamble */}
              <p className="indent-8 text-justify">
                Hợp đồng Phát hành Phần mềm này ("Hợp đồng") được lập và có hiệu lực kể từ ngày đại diện cuối cùng hoàn tất chữ ký điện tử trên hệ thống GodotLaunch. Hợp đồng được thỏa thuận tự nguyện giữa các bên dưới đây:
              </p>

              {/* Section 1: Parties */}
              <div className="space-y-3">
                <div className="font-bold border-b border-slate-300 dark:border-slate-800 pb-0.5 uppercase tracking-wide">
                  1. THÔNG TIN CÁC BÊN
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="font-bold mb-1">BÊN A: BÊN NHẬN PHÁT HÀNH (PLATFORM)</p>
                    <table className="w-full text-left border-none border-collapse text-xs">
                      <tbody>
                        <tr className="border-b border-slate-100 dark:border-slate-850">
                          <td className="w-1/3 py-1 font-semibold">Tên đơn vị:</td>
                          <td className="py-1">CÔNG TY CỔ PHẦN GODOT LAUNCH</td>
                        </tr>
                        <tr className="border-b border-slate-100 dark:border-slate-850">
                          <td className="py-1 font-semibold">Người đại diện:</td>
                          <td className="py-1 font-bold">{contract.buyerRepresentative || "Ban quản trị GodotLaunch"}</td>
                        </tr>
                        <tr className="border-b border-slate-100 dark:border-slate-850">
                          <td className="py-1 font-semibold">Chức vụ:</td>
                          <td className="py-1">{contract.buyerPosition || "Đại diện được ủy quyền"}</td>
                        </tr>
                        <tr>
                          <td className="py-1 font-semibold">Email liên hệ:</td>
                          <td className="py-1">admin@godotlaunch.com</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <p className="font-bold mb-1">BÊN B: ĐỐI TÁC PHÁT TRIỂN (DEVELOPER)</p>
                    <table className="w-full text-left border-none border-collapse text-xs">
                      <tbody>
                        <tr className="border-b border-slate-100 dark:border-slate-850">
                          <td className="w-1/3 py-1 font-semibold">Họ và Tên đại diện:</td>
                          <td className="py-1 font-bold">{sellerRepresentative || contract.sellerRepresentative || contract.sellerName}</td>
                        </tr>
                        <tr>
                          <td className="py-1 font-semibold">Địa chỉ thường trú:</td>
                          <td className="py-1">{sellerAddress || contract.sellerAddress || '(Chưa cập nhật)'}</td>
                        </tr>
                        <tr>
                          <td className="py-1 font-semibold">Email tài khoản:</td>
                          <td className="py-1">{contract.sellerEmail || contract.sellerName}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Section 2: Subject */}
              <div className="space-y-1.5">
                <div className="font-bold border-b border-slate-300 dark:border-slate-800 pb-0.5 uppercase tracking-wide">
                  2. ĐỐI TƯỢNG HỢP ĐỒNG
                </div>
                <p className="text-justify">
                  Bên B cam kết là chủ sở hữu hợp pháp duy nhất đối với sản phẩm trò chơi điện tử tương tác có tiêu đề là <strong>"{contract.gameTitle}"</strong>. Hình thức hợp tác đã được các bên thống nhất lựa chọn là: 
                  <span className="font-bold uppercase ml-1">
                    {contract.contractType === 'co_publishing' ? 'Đồng phát hành (Co-Publishing)' : 'Mua đứt bản quyền (Full Acquisition)'}
                  </span>.
                </p>
              </div>

              {/* Section 3: Financial */}
              <div className="space-y-2">
                <div className="font-bold border-b border-slate-300 dark:border-slate-800 pb-0.5 uppercase tracking-wide">
                  3. ĐIỀU KHOẢN TÀI CHÍNH &amp; KHAI THÁC
                </div>
                {contract.contractType === 'co_publishing' ? (
                  <div className="text-slate-850 dark:text-slate-300 text-justify text-xs space-y-2 leading-relaxed">
                    <p>
                      Hai bên thống nhất cùng vận hành và chia sẻ doanh thu thu được từ hoạt động thương mại hóa Trò chơi (sau khi đã trừ các khoản thuế phát sinh và phí cổng thanh toán của bên thứ ba) theo tỷ lệ như sau:
                    </p>
                    <ul className="list-disc pl-5 font-bold space-y-0.5">
                      <li>Tỷ lệ của Bên B (Nhà phát triển): {contract.revenueSplit}%</li>
                      <li>Tỷ lệ của Bên A (Nền tảng): {100 - (contract.revenueSplit || 0)}%</li>
                    </ul>
                    <p>
                      Bên A có trách nhiệm tự động quyết toán phần doanh thu được chia của Bên B vào tài khoản ví điện tử Godot Launch của Bên B ngay khi mỗi giao dịch bán Trò chơi hoàn tất thành công.
                    </p>
                  </div>
                ) : (
                  <div className="text-slate-850 dark:text-slate-300 text-justify text-xs space-y-2 leading-relaxed">
                    <p>
                      Bên B đồng ý chuyển nhượng vĩnh viễn và không hủy ngang toàn bộ bản quyền, quyền tác giả, mã nguồn, tài nguyên đồ họa/âm thanh và mọi quyền thương mại của Trò chơi sang Bên A kể từ Ngày Hiệu lực.
                    </p>
                    <p>
                      Bên A sẽ thanh toán một khoản tiền trọn gói duy nhất trị giá <strong>{contract.lumpSumAmount || 'thỏa thuận'}</strong> cho Bên B. Sau khi nhận thanh toán, Bên B cam kết không có thêm bất kỳ yêu cầu đòi chia sẻ doanh thu hay bản quyền phát sinh nào đối với Trò chơi.
                    </p>
                  </div>
                )}
              </div>

              {/* Section 4: Intellectual Property & Confidentiality */}
              <div className="space-y-2">
                <div className="font-bold border-b border-slate-300 dark:border-slate-800 pb-0.5 uppercase tracking-wide">
                  4. SỞ HỮU TRÍ TUỆ &amp; BẢO MẬT
                </div>
                <div className="text-slate-850 dark:text-slate-300 text-justify text-xs space-y-2 leading-relaxed">
                  <p>
                    <strong>4.1 Quyền sở hữu trí tuệ:</strong> Đối với mô hình Đồng phát hành, Bên B giữ nguyên quyền sở hữu trí tuệ đối với Trò chơi; Bên A được cấp quyền phát hành số trên nền tảng. Đối với mô hình Mua đứt, quyền sở hữu trí tuệ thuộc về Bên A hoàn toàn và vĩnh viễn kể từ thời điểm ký kết Hợp đồng.
                  </p>
                  <p>
                    <strong>4.2 Bảo mật thông tin:</strong> Cả hai Bên cam kết bảo mật tuyệt đối mọi thông tin kỹ thuật, dữ liệu thương mại, mã nguồn (source code) của Trò chơi và nội dung Hợp đồng này. Không bên nào được phép sao chép, cung cấp hoặc tiết lộ cho bên thứ ba khi chưa được sự đồng ý bằng văn bản của bên kia.
                  </p>
                  <p>
                    <strong>4.3 Cam kết không bán lại/phân phối mã nguồn:</strong>
                    <br />- Đối với mô hình Đồng phát hành: Bên B cam kết không bán, phân phối hoặc cấp phép sử dụng mã nguồn hoặc tài nguyên gốc của Trò chơi cho bất kỳ nền tảng, bên thứ ba hay đối thủ cạnh tranh nào khác mà không có sự đồng ý trước bằng văn bản của Bên A.
                    <br />- Đối với mô hình Mua đứt: Bản quyền và quyền sở hữu độc quyền mã nguồn thuộc về Bên A. Bên B tuyệt đối không được phép sử dụng, sao chép, phân phối, chuyển nhượng hoặc bán mã nguồn của Trò chơi cho bất kỳ cá nhân hay tổ chức nào khác dưới mọi hình thức.
                  </p>
                  <p>
                    <strong>4.4 Không sao chép, ăn cắp chất xám:</strong> Bên B đảm bảo Trò chơi và mọi tài nguyên cấu thành (mã nguồn, hình ảnh, âm thanh, thiết kế) là tác phẩm sáng tạo gốc của Bên B, không sao chép, đạo nhái, ăn cắp ý tưởng hoặc xâm phạm quyền sở hữu trí tuệ của bất kỳ cá nhân hay tổ chức nào khác.
                  </p>
                  <p>
                    <strong>4.5 Trách nhiệm vi phạm và tố cáo/tố giác:</strong> Nếu Bên B bị phát hiện hoặc bị bên thứ ba cáo buộc/tố giác vi phạm bản quyền sở hữu trí tuệ, sao chép trái phép, tự ý bán mã nguồn hoặc vi phạm nghĩa vụ bảo mật:
                    <br />1. Bên B phải chịu hoàn toàn trách nhiệm trước pháp luật và bồi thường mọi tổn thất, thiệt hại thực tế phát sinh cho Bên A và các bên liên quan.
                    <br />2. Bên A có quyền đơn phương chấm dứt Hợp đồng ngay lập tức, gỡ bỏ Trò chơi khỏi nền tảng Godot Launch, đình chỉ tài khoản ví của Bên B và giữ lại toàn bộ số dư ví hoặc doanh thu chưa thanh toán để xử lý tranh chấp hoặc khấu trừ bồi thường thiệt hại.
                  </p>
                </div>
              </div>

              {/* Section 5: Validity, Termination & Dispute Resolution */}
              <div className="space-y-2">
                <div className="font-bold border-b border-slate-300 dark:border-slate-800 pb-0.5 uppercase tracking-wide">
                  5. HIỆU LỰC, CHẤM DỨT &amp; GIẢI QUYẾT TRANH CHẤP
                </div>
                <div className="text-slate-850 dark:text-slate-300 text-justify text-xs space-y-2 leading-relaxed">
                  <p>
                    <strong>5.1 Hiệu lực &amp; Thời hạn:</strong> Hợp đồng này có hiệu lực kể từ ngày đại diện cả hai Bên hoàn tất việc ký điện tử trên hệ thống Godot Launch và kéo dài cho đến khi được chấm dứt hợp pháp hoặc hoàn tất các nghĩa vụ liên quan.
                  </p>
                  <p>
                    <strong>5.2 Giải quyết tranh chấp:</strong> {contract.disputeResolutionClause || "Mọi tranh chấp phát sinh từ hoặc liên quan đến hợp đồng này sẽ được giải quyết trước tiên thông qua thương lượng thân thiện. Nếu không giải quyết được, tranh chấp sẽ được đưa ra giải quyết tại Trung tâm giải quyết tranh chấp kỹ thuật số thuộc hệ thống Godot Launch hoặc cơ quan Trọng tài có thẩm quyền theo quy định."}
                  </p>
                </div>
              </div>

              {/* Section 6: Additional */}
              {contract.additionalTerms && (
                <div className="space-y-1.5">
                  <div className="font-bold border-b border-slate-300 dark:border-slate-800 pb-0.5 uppercase tracking-wide">
                    6. ĐIỀU KHOẢN BỔ SUNG
                  </div>
                  <p className="italic text-slate-800 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded border border-slate-200 dark:border-slate-800 text-justify">{contract.additionalTerms}</p>
                </div>
              )}

              {/* Signature area */}
              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-300 dark:border-slate-800 text-xs">
                
                {/* Bên B Signature */}
                <div className="text-center p-3 border border-dashed border-slate-300 dark:border-slate-800 rounded bg-slate-50/50 dark:bg-slate-900/30 flex flex-col items-center justify-between min-h-[140px]">
                  <span className="font-bold text-[10px] block">ĐẠI DIỆN BÊN B</span>
                  {contract.sellerSignatureBase64 ? (
                    <div className="my-2 flex flex-col items-center">
                      <img 
                        src={contract.sellerSignatureBase64} 
                        alt="Developer Signature" 
                        className="max-h-16 w-auto object-contain"
                      />
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5 mt-1">
                        ✓ ĐÃ KÝ ĐIỆN TỬ
                      </span>
                    </div>
                  ) : devSignature ? (
                    <div className="my-2 flex flex-col items-center opacity-60">
                      <img 
                        src={devSignature} 
                        alt="Pending Signature" 
                        className="max-h-12 w-auto object-contain"
                      />
                      <span className="text-[9px] text-amber-500 font-bold italic">Chưa xác nhận gửi</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium italic my-4">Chờ chữ ký của Bên B</span>
                  )}
                  <div>
                    <span className="block font-bold text-slate-800 dark:text-slate-200">
                      {contract.sellerRepresentative || (mode === 'sign-developer' ? sellerRepresentative : '') || contract.sellerName}
                    </span>
                    <span className="block text-[9px] text-slate-400">
                      {contract.signedAtSeller ? `Ký ngày: ${new Date(contract.signedAtSeller).toLocaleString()}` : ''}
                    </span>
                  </div>
                </div>

                {/* Bên A Signature */}
                <div className="text-center p-3 border border-dashed border-slate-300 dark:border-slate-800 rounded bg-slate-50/50 dark:bg-slate-900/30 flex flex-col items-center justify-between min-h-[140px]">
                  <span className="font-bold text-[10px] block">ĐẠI DIỆN BÊN A</span>
                  {contract.buyerSignatureBase64 ? (
                    <div className="my-2 flex flex-col items-center">
                      <img
                        src={contract.buyerSignatureBase64}
                        alt="Admin Signature"
                        className="max-h-16 w-auto object-contain"
                      />
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5 mt-1">
                        ✓ ĐÃ KÝ ĐIỆN TỬ
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium italic my-4">Chờ chữ ký của Bên A</span>
                  )}
                  <div>
                    <span className="block font-bold text-slate-800 dark:text-slate-200">
                      {contract.buyerRepresentative || "Ban quản trị GodotLaunch"}
                    </span>
                    <span className="block text-[9px] text-slate-400">
                      {contract.signedAtBuyer ? `Ký ngày: ${new Date(contract.signedAtBuyer).toLocaleString()}` : ''}
                    </span>
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* Right Panel: Actions & Signing Flow */}
          <div className="contract-right-panel lg:col-span-5 space-y-4">
            
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 shadow-sm">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Clock size={14} className="text-amber-500" /> THÔNG TIN KIỂM TOÁN HỢP ĐỒNG
              </h3>

              <div className="space-y-3 text-xs leading-normal">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span className="text-slate-500 dark:text-slate-400">Dự án áp dụng:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{contract.gameTitle}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span className="text-slate-500 dark:text-slate-400">Hình thức:</span>
                  <span className="font-semibold text-sky-500">
                    {contract.contractType === 'co_publishing' ? 'Đồng phát hành' : 'Mua đứt bản quyền'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span className="text-slate-500 dark:text-slate-400">Cam kết tài chính:</span>
                  <span className="font-bold text-amber-500">
                    {contract.contractType === 'co_publishing' 
                      ? `${contract.revenueSplit}% Doanh thu`
                      : `${contract.lumpSumAmount} đ`}
                  </span>
                </div>
              </div>

              {/* Download actions for signed contract */}
              {contract.status === 'signed' && (
                <div className="pt-2">
                  {contract.pdfUrl ? (
                    <a
                      href={contract.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs transition-colors shadow-lg shadow-emerald-500/10 cursor-pointer"
                    >
                      <Download size={14} /> Tải xuống Hợp đồng PDF chính thức
                    </a>
                  ) : (
                    <button
                      onClick={handlePrint}
                      className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs transition-colors shadow-lg shadow-emerald-500/10 cursor-pointer"
                    >
                      <Download size={14} /> Tải xuống Hợp đồng PDF
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ERROR DISPLAY */}
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold">
                Lỗi: {errorMsg}
              </div>
            )}

            {/* MODE: SIGN DEVELOPER */}
            {mode === 'sign-developer' && !contract.signedAtSeller && (
              isRejecting ? (
                <div className="space-y-4 animate-fade-in bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-2 text-xs">
                    <span className="text-xs font-bold text-rose-600 uppercase font-mono block flex items-center gap-1.5">
                      <AlertTriangle size={14} /> Chọn phương thức phản hồi hợp đồng
                    </span>
                    <p className="text-slate-500 leading-normal">
                      Bạn có thể chọn Thương lượng lại điều khoản để sửa đổi hợp đồng hiện tại hoặc Hủy bỏ để ngưng toàn bộ quy trình phát hành.
                    </p>
                  </div>

                  <div className="flex gap-4 p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-250 dark:border-slate-850">
                    <label className="flex-1 flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-55/50 dark:hover:bg-slate-900/50">
                      <input 
                        type="radio" 
                        name="rejectType" 
                        value="negotiate" 
                        checked={rejectType === 'negotiate'} 
                        onChange={() => setRejectType('negotiate')} 
                        className="text-amber-500 focus:ring-amber-500"
                      />
                      <div>
                        <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">Thương lượng lại</span>
                        <span className="block text-[10px] text-slate-400">Đề xuất sửa đổi Hợp đồng này</span>
                      </div>
                    </label>

                    <label className="flex-1 flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-55/50 dark:hover:bg-slate-900/50">
                      <input 
                        type="radio" 
                        name="rejectType" 
                        value="cancel" 
                        checked={rejectType === 'cancel'} 
                        onChange={() => setRejectType('cancel')} 
                        className="text-rose-500 focus:ring-rose-500"
                      />
                      <div>
                        <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">Hủy không ký</span>
                        <span className="block text-[10px] text-slate-400">Rút yêu cầu phát hành & hủy hợp đồng</span>
                      </div>
                    </label>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-550 block">
                      {rejectType === 'negotiate' ? 'Nội dung đề xuất thương lượng:' : 'Lý do hủy hợp đồng:'}
                    </label>
                    <textarea
                      className="w-full h-32 px-3 py-2 border rounded-xl text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-850 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      placeholder={rejectType === 'negotiate' ? "Ví dụ: Đề xuất tỷ lệ chia sẻ doanh thu cho Developer là 75%..." : "Nhập lý do rút/hủy bỏ yêu cầu phát hành..."}
                      value={rejectionReasonInput}
                      onChange={(e) => setRejectionReasonInput(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsRejecting(false)}
                      className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs transition-colors cursor-pointer text-center"
                    >
                      Quay lại
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting || !rejectionReasonInput.trim()}
                      onClick={handleDevReject}
                      className={`flex-1 py-2.5 px-4 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer text-center flex items-center justify-center gap-1 shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${
                        rejectType === 'negotiate' 
                          ? 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/20' 
                          : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                      }`}
                    >
                      <XCircle size={14} /> {isSubmitting ? 'Đang gửi...' : rejectType === 'negotiate' ? 'Gửi yêu cầu Thương lượng' : 'Xác nhận Hủy bỏ'}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleDevSubmit} className="space-y-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 text-xs">
                    <span className="text-xs font-bold text-sky-500 uppercase font-mono block">
                      XÁC THỰC THÔNG TIN KÝ TÊN BÊN B
                    </span>
                    <p className="text-slate-500 leading-normal">
                      Vui lòng điền đầy đủ và kiểm tra thông tin pháp lý bên dưới trước khi thực hiện ký tên vào hợp đồng điện tử.
                    </p>
                  </div>

                  <Input
                    label="Họ tên đại diện Bên B"
                    value={sellerRepresentative}
                    onChange={(e) => setSellerRepresentative(e.target.value)}
                    required
                  />

                  <Input
                    label="Địa chỉ thường trú"
                    value={sellerAddress}
                    onChange={(e) => setSellerAddress(e.target.value)}
                    required
                  />

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-550 block">
                      Vẽ chữ ký của bạn:
                    </label>
                    <SignaturePad
                      onChange={setDevSignature}
                      placeholder="Dùng chuột để vẽ chữ ký của bạn..."
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsRejecting(true)}
                      className="flex-1 py-2.5 px-4 bg-rose-50 hover:bg-rose-500 dark:bg-rose-950/30 dark:hover:bg-rose-600 text-rose-600 dark:text-rose-300 hover:text-white dark:hover:text-white font-bold border-2 border-rose-300 dark:border-rose-900 rounded-xl text-xs transition-all duration-200 cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-sm hover:shadow-lg hover:shadow-rose-500/20 active:scale-[0.98]"
                      title="Từ chối hợp đồng này và gửi phản hồi cho Admin"
                    >
                      <XCircle size={14} /> Từ chối hợp đồng
                    </button>
                    <Button
                      variant="primary"
                      size="md"
                      type="submit"
                      className="flex-1 cursor-pointer"
                      disabled={!devSignature || isSubmitting}
                      icon={<PenTool size={14} />}
                    >
                      {isSubmitting ? 'Đang gửi...' : 'Hoàn tất Ký tên'}
                    </Button>
                  </div>
                </form>
              )
            )}

            {/* MODE: VIEW ONLY */}
            {mode === 'view' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                  Chế độ xem hợp đồng chính thức. Bạn có thể tải file PDF điện tử để lưu trữ.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs transition-colors cursor-pointer text-center"
                >
                  Đóng cửa sổ
                </button>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>,
    document.body
  );
};
