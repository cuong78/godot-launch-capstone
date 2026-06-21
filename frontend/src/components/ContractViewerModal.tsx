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
  mode?: 'view' | 'sign-developer' | 'sign-admin';
  onSignSuccess?: () => void;
  // Callbacks for API integration inside the modal
  onSignDeveloper?: (signatureBase64: string, rep: string, addr: string, tax: string) => Promise<{ success: boolean; message?: string }>;
  onSignAdmin?: (signatureBase64: string) => Promise<{ success: boolean; message?: string }>;
  onRejectDeveloper?: (rejectionReason: string) => Promise<{ success: boolean; message?: string }>;
}

export const ContractViewerModal: React.FC<ContractViewerModalProps> = ({
  contract,
  currentUser,
  onClose,
  mode = 'view',
  onSignSuccess,
  onSignDeveloper,
  onSignAdmin,
  onRejectDeveloper
}) => {
  // Developer signing states
  const [sellerRepresentative, setSellerRepresentative] = useState(contract.sellerRepresentative || currentUser?.fullName || '');
  const [sellerAddress, setSellerAddress] = useState(contract.sellerAddress || '');
  const [sellerTaxCode, setSellerTaxCode] = useState(contract.sellerTaxCode || '');
  const [devSignature, setDevSignature] = useState<string | null>(null);

  // Admin signing states
  const [adminSignature, setAdminSignature] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

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
  const getStepStatus = (step: 1 | 2 | 3) => {
    if (step === 1) return 'completed';
    if (step === 2) {
      if (contract.signedAtSeller) return 'completed';
      return (contract.status === 'pending' || contract.status === 're_issued') ? 'active' : 'upcoming';
    }
    if (step === 3) {
      if (contract.status === 'signed') return 'completed';
      return contract.signedAtSeller ? 'active' : 'upcoming';
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
      const res = await onRejectDeveloper(rejectionReasonInput.trim());
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

  const handleAdminSubmit = async () => {
    if (!onSignAdmin || !adminSignature) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await onSignAdmin(adminSignature);
      if (res.success) {
        if (onSignSuccess) onSignSuccess();
      } else {
        setErrorMsg(res.message || 'Lỗi ký đối ứng');
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
                const getStatusInfo = (status: string, signedAtSeller?: string | null) => {
                  switch (status) {
                    case 'signed':
                      return { text: 'Đã hoàn tất / Completed', colorClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
                    case 'negotiating':
                      return { text: 'Thương lượng / Negotiating', colorClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20' };
                    case 're_issued':
                      return signedAtSeller
                        ? { text: 'Đã ký (Chờ đối ứng) / Signed (Pending Admin)', colorClass: 'bg-sky-500/10 text-sky-500 border-sky-500/20' }
                        : { text: 'Cấp lại / Re-issued', colorClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse' };
                    case 'cancelled':
                      return { text: 'Đã hủy / Cancelled', colorClass: 'bg-slate-500/10 text-slate-550 border-slate-500/20' };
                    case 'expired':
                      return { text: 'Hết hạn / Expired', colorClass: 'bg-slate-500/10 text-slate-550 border-slate-500/20' };
                    case 'pending':
                    default:
                      return signedAtSeller
                        ? { text: 'Đã ký (Chờ đối ứng) / Signed (Pending Admin)', colorClass: 'bg-sky-500/10 text-sky-500 border-sky-500/20' }
                        : { text: 'Chờ ký / Pending', colorClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse' };
                  }
                };
                const statusInfo = getStatusInfo(contract.status, contract.signedAtSeller);
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
        <div className="contract-stepper-bar grid grid-cols-3 gap-4 mb-6 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-850">
          {[
            { step: 1, title: 'Khởi tạo hợp đồng', desc: 'Admin biên soạn điều khoản', icon: <FileText size={16} /> },
            { step: 2, title: 'Developer ký tên', desc: contract.signedAtSeller ? `Đã ký lúc ${new Date(contract.signedAtSeller).toLocaleDateString()}` : 'Đang chờ ký tên', icon: <PenTool size={16} /> },
            { step: 3, title: 'Admin ký đối ứng', desc: contract.signedAtBuyer ? `Đã hoàn tất ${new Date(contract.signedAtBuyer).toLocaleDateString()}` : 'Chờ hoàn tất', icon: <ShieldCheck size={16} /> }
          ].map((item) => {
            const status = getStepStatus(item.step as 1 | 2 | 3);
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
                          <td className="py-1 font-bold">{contract.buyerRepresentative}</td>
                        </tr>
                        <tr className="border-b border-slate-100 dark:border-slate-850">
                          <td className="py-1 font-semibold">Chức vụ:</td>
                          <td className="py-1">{contract.buyerPosition}</td>
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
                        <tr className="border-b border-slate-100 dark:border-slate-850">
                          <td className="py-1 font-semibold">Địa chỉ thường trú:</td>
                          <td className="py-1">{sellerAddress || contract.sellerAddress || '(Chưa cập nhật)'}</td>
                        </tr>
                        <tr className="border-b border-slate-100 dark:border-slate-850">
                          <td className="py-1 font-semibold">Mã số thuế:</td>
                          <td className="py-1">{sellerTaxCode || contract.sellerTaxCode || '(Chưa cập nhật)'}</td>
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
              <div className="space-y-1.5">
                <div className="font-bold border-b border-slate-300 dark:border-slate-800 pb-0.5 uppercase tracking-wide">
                  3. ĐIỀU KHOẢN TÀI CHÍNH
                </div>
                {contract.contractType === 'co_publishing' ? (
                  <p className="text-justify">
                    Hai bên thống nhất phân chia doanh thu thu được từ hoạt động thương mại hóa Trò chơi trên nền tảng GodotLaunch theo tỷ lệ: Bên B nhận <strong>{contract.revenueSplit}%</strong> và Bên A nhận <strong>{100 - (contract.revenueSplit || 0)}%</strong> trên tổng doanh thu ròng.
                  </p>
                ) : (
                  <p className="text-justify">
                    Bên A sẽ thanh toán một khoản tiền trọn gói duy nhất trị giá <strong>{contract.lumpSumAmount || 'thỏa thuận'}</strong> cho Bên B để sở hữu và nhận chuyển giao toàn bộ quyền tác giả và quyền thương mại đối với Trò chơi.
                  </p>
                )}
              </div>

              {/* Section 4: Dispute */}
              <div className="space-y-1.5">
                <div className="font-bold border-b border-slate-300 dark:border-slate-800 pb-0.5 uppercase tracking-wide">
                  4. GIẢI QUYẾT TRANH CHẤP
                </div>
                <p className="whitespace-pre-line text-slate-800 dark:text-slate-300 text-justify text-xs leading-normal">{contract.disputeResolutionClause}</p>
              </div>

              {/* Section 5: Additional */}
              {contract.additionalTerms && (
                <div className="space-y-1.5">
                  <div className="font-bold border-b border-slate-300 dark:border-slate-800 pb-0.5 uppercase tracking-wide">
                    5. ĐIỀU KHOẢN BỔ SUNG
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
                        ✓ ĐÃ KÝ ĐỐI ỨNG
                      </span>
                    </div>
                  ) : adminSignature ? (
                    <div className="my-2 flex flex-col items-center opacity-60">
                      <img 
                        src={adminSignature} 
                        alt="Pending Signature" 
                        className="max-h-12 w-auto object-contain"
                      />
                      <span className="text-[9px] text-amber-500 font-bold italic">Chưa xác nhận gửi</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium italic my-4">Chờ chữ ký của Bên A</span>
                  )}
                  <div>
                    <span className="block font-bold text-slate-800 dark:text-slate-200">
                      {contract.buyerRepresentative}
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
                      : `$${contract.lumpSumAmount}`}
                  </span>
                </div>
                <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 space-y-0.5">
                  <span className="text-slate-500 dark:text-slate-400 block">Mã băm điều khoản (SHA-256 Hash):</span>
                  <code className="text-[10px] break-all font-mono bg-slate-100 dark:bg-slate-950 p-1 rounded block text-slate-600 dark:text-slate-300 select-all border border-slate-200/55 dark:border-slate-850">
                    {contract.termsHash || 'Pending contract hashing...'}
                  </code>
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
                      <AlertTriangle size={14} /> Xác nhận từ chối ký hợp đồng
                    </span>
                    <p className="text-slate-500 leading-normal">
                      Vui lòng nhập lý do từ chối cụ thể. Ban quản trị hệ thống (Admin) sẽ xem xét phản hồi của bạn để chỉnh sửa các điều khoản hợp đồng cho phù hợp.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-550 block">
                      Lý do từ chối:
                    </label>
                    <textarea
                      className="w-full h-32 px-3 py-2 border rounded-xl text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-850 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      placeholder="Nhập lý do từ chối chi tiết..."
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
                      className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer text-center flex items-center justify-center gap-1 shadow-lg shadow-rose-600/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <XCircle size={14} /> {isSubmitting ? 'Đang gửi...' : 'Xác nhận Từ chối'}
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

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Họ tên đại diện Bên B"
                      value={sellerRepresentative}
                      onChange={(e) => setSellerRepresentative(e.target.value)}
                      required
                    />
                    <Input
                      label="Mã số thuế"
                      value={sellerTaxCode}
                      onChange={(e) => setSellerTaxCode(e.target.value)}
                      required
                    />
                  </div>

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

            {/* MODE: SIGN ADMIN */}
            {mode === 'sign-admin' && contract.signedAtSeller && !contract.signedAtBuyer && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 text-xs">
                  <span className="text-xs font-bold text-sky-500 uppercase font-mono block">
                    XÁC THỰC KÝ ĐỐI ỨNG BÊN A
                  </span>
                  <p className="text-slate-500 leading-normal">
                    Developer đã ký xác nhận các điều khoản hợp đồng. Bạn thực hiện ký đối ứng với tư cách đại diện Ban quản trị GodotLaunch để hoàn tất xuất bản game.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-550 block">
                    Vẽ chữ ký của Admin:
                  </label>
                  <SignaturePad
                    onChange={setAdminSignature}
                    placeholder="Dùng chuột để vẽ chữ ký đại diện Bên A..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs transition-colors cursor-pointer text-center"
                  >
                    Quay lại
                  </button>
                  <Button
                    variant="primary"
                    size="md"
                    className="flex-1 cursor-pointer"
                    disabled={!adminSignature || isSubmitting}
                    onClick={handleAdminSubmit}
                    icon={<ShieldCheck size={14} />}
                  >
                    {isSubmitting ? 'Đang duyệt...' : 'Ký đối ứng & Xuất bản'}
                  </Button>
                </div>
              </div>
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
