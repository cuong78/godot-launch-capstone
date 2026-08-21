import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  BookOpen,
  Sparkles,
  Download,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  FileArchive,
  FileCode,
  Layers,
  HelpCircle,
  Info,
} from "lucide-react";
import { Button } from "./Button";

interface UploadGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  programType?: "game" | "marketplace";
}

export const UploadGuideModal: React.FC<UploadGuideModalProps> = ({
  isOpen,
  onClose,
  programType = "game",
}) => {
  const [activeTab, setActiveTab] = useState<"godot_web" | "zip_structure" | "tips">("godot_web");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const templateDownloadUrl = `${
    import.meta.env.VITE_API_URL || "http://localhost:8080"
  }/api/v1/${programType === "game" ? "games" : "assets"}/template`;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-4 sm:p-6 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative border-b border-slate-200/80 bg-gradient-to-r from-amber-500/10 via-slate-50 to-amber-500/5 p-6 dark:border-slate-800 dark:from-amber-500/15 dark:via-slate-900 dark:to-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20 shrink-0">
              <BookOpen size={24} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <Sparkles size={14} /> Dành Cho Lập Trình Viên Game (Developer Guide)
              </div>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                Hướng Dẫn Xuất Godot HTML5 Web Demo & Đóng Gói Tệp ZIP
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-all cursor-pointer"
            aria-label="Đóng hướng dẫn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200/80 bg-slate-100/70 dark:border-slate-800 dark:bg-slate-900/60 px-6 pt-3 gap-2 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("godot_web")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer ${
              activeTab === "godot_web"
                ? "border-amber-500 bg-white dark:bg-slate-950 text-amber-600 dark:text-amber-400 shadow-sm"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <FileCode size={16} /> 1. Xuất Godot HTML5 (Web Demo)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("zip_structure")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer ${
              activeTab === "zip_structure"
                ? "border-amber-500 bg-white dark:bg-slate-950 text-amber-600 dark:text-amber-400 shadow-sm"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <FileArchive size={16} /> 2. Cấu Trúc File ZIP Chuẩn
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tips")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer ${
              activeTab === "tips"
                ? "border-amber-500 bg-white dark:bg-slate-950 text-amber-600 dark:text-amber-400 shadow-sm"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <HelpCircle size={16} /> 3. Quy Định & Mẹo Upload
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: GODOT HTML5 EXPORT GUIDE */}
          {activeTab === "godot_web" && (
            <div className="space-y-6 text-sm leading-relaxed animate-fade-in">
              {/* Welcome Banner */}
              <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4.5 dark:border-sky-800/60 dark:bg-sky-950/30 flex items-start gap-3.5">
                <Info size={22} className="text-sky-500 shrink-0 mt-0.5" />
                <div className="text-xs text-sky-900 dark:text-sky-200 space-y-1">
                  <p className="font-bold text-sm">
                    Chào mừng bạn đến với GodotLaunch!
                  </p>
                  <p>
                    Bản Web Demo (HTML5/WebAssembly) giúp người chơi và nhà đầu tư trải nghiệm trực tiếp game của bạn ngay trên trình duyệt mà không cần tải file về. Dưới đây là hướng dẫn từng bước chi tiết để xuất dự án từ <strong>Godot Engine (Godot 4.x & 3.x)</strong>.
                  </p>
                </div>
              </div>

              {/* Step 1: Install Export Templates */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 font-display font-bold text-base text-amber-600 dark:text-amber-400">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-xs text-amber-500 font-mono">
                    1
                  </span>
                  Cài Đặt Export Templates Trong Godot Engine
                </div>
                <div className="pl-9 space-y-1.5 text-slate-600 dark:text-slate-300 text-xs">
                  <p>• Mở dự án game của bạn trong Godot Engine.</p>
                  <p>• Trên thanh menu chính, chọn: <code className="bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded font-mono font-bold text-slate-800 dark:text-slate-200">Editor</code> ➔ <code className="bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded font-mono font-bold text-slate-800 dark:text-slate-200">Manage Export Templates...</code></p>
                  <p>• Nhấn nút <strong>Download and Install</strong> (Godot sẽ tự động tải bộ export template phù hợp với phiên bản Godot của bạn).</p>
                </div>
              </div>

              {/* Step 2: Configure Export Preset */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 font-display font-bold text-base text-amber-600 dark:text-amber-400">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-xs text-amber-500 font-mono">
                    2
                  </span>
                  Thêm Cấu Hình Export Web (HTML5)
                </div>
                <div className="pl-9 space-y-1.5 text-slate-600 dark:text-slate-300 text-xs">
                  <p>• Vào menu: <code className="bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded font-mono font-bold text-slate-800 dark:text-slate-200">Project</code> ➔ <code className="bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded font-mono font-bold text-slate-800 dark:text-slate-200">Export...</code></p>
                  <p>• Nhấn nút <strong>Add...</strong> ở góc trên và chọn <strong>Web (HTML5)</strong>.</p>
                </div>
              </div>

              {/* Step 3: Important Settings */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 font-display font-bold text-base text-amber-600 dark:text-amber-400">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-xs text-amber-500 font-mono">
                    3
                  </span>
                  Cấu Hình Thông Số Màn Hình & Tương Thích Trình Duyệt
                </div>
                <div className="pl-9 space-y-3 text-slate-600 dark:text-slate-300 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                    <p className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Layers size={14} className="text-amber-500" /> Về Khung Hiển Thị Màn Hình (Display/Window):
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-slate-500 dark:text-slate-400">
                      <li> Co giãn vừa khung: Vào <code className="font-mono bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-800 dark:text-slate-200">Project Settings ➔ Display ➔ Window ➔ Stretch ➔ Mode</code>: Chọn <strong>canvas_items</strong> hoặc <strong>viewport</strong>.</li>
                      <li> Aspect: Chọn <strong>keep</strong> hoặc <strong>expand</strong> để khung game tự động vừa vặn trên các màn hình khác nhau.</li>
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                      <AlertTriangle size={15} /> Lưu ý quan trọng cho Godot 4.x (WebAssembly Single-Threaded):
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      Trong Godot 4.x, nếu bạn bật Threads (Multi-threading), trình duyệt sẽ yêu cầu tiêu đề bảo mật SharedArrayBuffer đặc thù. Để đảm bảo game Web Demo chạy mượt mà trên 100% máy người chơi mà không bị chặn Cross-Origin, hãy chọn <strong>Export Mode: Single-Threaded / Compatibility</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 4: Export Files & Naming */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 font-display font-bold text-base text-amber-600 dark:text-amber-400">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-xs text-amber-500 font-mono">
                    4
                  </span>
                  Xuất File & Bắt Buộc Đặt Tên File Khởi Chạy Là <code className="font-mono bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded">index.html</code>
                </div>
                <div className="pl-9 space-y-2 text-slate-600 dark:text-slate-300 text-xs">
                  <p>• Nhấn nút <strong>Export Project...</strong></p>
                  <p>• Trong hộp thoại lưu file, bắt buộc đặt tên file chính là: <code className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">index.html</code></p>
                  <p>• Bộ 4 tệp tin chính được Godot tự động xuất ra gồm có:</p>
                  <div className="grid grid-cols-2 gap-2 my-2 font-mono text-[11px]">
                    <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                      📄 <strong className="text-sky-500">index.html</strong> (Trang khởi chạy)
                    </div>
                    <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                      ⚡ <strong className="text-sky-500">index.js</strong> (Loader Javascript)
                    </div>
                    <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                      ⚙️ <strong className="text-sky-500">index.wasm</strong> (Mã máy WebAssembly)
                    </div>
                    <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                      📦 <strong className="text-sky-500">index.pck</strong> (Dữ liệu tài nguyên game)
                    </div>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">
                    ➔ Đặt toàn bộ 4 file này vào thư mục <code className="font-mono text-emerald-500 font-bold">web_demo/html5_files/</code> như sơ đồ Tab 2 trước khi nén ZIP.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ZIP FOLDER STRUCTURE */}
          {activeTab === "zip_structure" && (
            <div className="space-y-6 text-sm leading-relaxed animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    Sơ Đồ Cấu Trúc Thư Mục ZIP Chuẩn
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Hệ thống sẽ tự động quét, phân tách thumbnail, screenshots, video trailer và web demo khi bạn tải lên 1 tệp ZIP duy nhất.
                  </p>
                </div>
                <a
                  href={templateDownloadUrl}
                  download={programType === "game" ? "game_template.zip" : "asset_template.zip"}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition-all shrink-0 active:scale-95 cursor-pointer"
                >
                  <Download size={14} /> Tải Template Mẫu ZIP
                </a>
              </div>

              {/* Tree View */}
              <div className="bg-slate-900 text-slate-200 p-5 rounded-2xl font-mono text-xs border border-slate-800 space-y-2 shadow-inner">
                <div className="text-amber-400 font-bold flex items-center justify-between border-b border-slate-800 pb-2">
                  <span>📦 my_project_bundle.zip (Thư mục gốc ZIP)</span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `my_project_bundle.zip\n├── thumbnail/\n│   └── thumbnail.png\n├── screenshots/\n│   ├── screenshot1.png\n│   ├── screenshot2.png\n│   └── screenshot3.png\n├── video/\n│   └── trailer.mp4\n└── web_demo/\n    └── html5_files/\n        ├── index.html\n        ├── index.js\n        ├── index.wasm\n        └── index.pck`,
                        "tree"
                      )
                    }
                    className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded cursor-pointer"
                  >
                    {copiedCode === "tree" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    {copiedCode === "tree" ? "Đã copy" : "Copy sơ đồ"}
                  </button>
                </div>
                <pre className="text-slate-300 leading-relaxed overflow-x-auto pt-1">
{`├── 📁 thumbnail/
│   └── 📄 thumbnail.png            (Ảnh đại diện chính, tỉ lệ 16:9 hoặc 1:1, PNG/JPG)
├── 📁 screenshots/
│   ├── 📄 screenshot1.png          (Ảnh chụp màn hình 1)
│   ├── 📄 screenshot2.png          (Ảnh chụp màn hình 2)
│   └── 📄 screenshot3.png          (Tối đa 10 ảnh)
├── 📁 video/
│   └── 📄 trailer.mp4              (Video gameplay trailer, định dạng MP4 - không bắt buộc)
${
  programType === "game"
    ? `└── 📁 web_demo/
    └── 📁 html5_files/             (Thư mục chứa bản xuất Godot Web HTML5)
        ├── 📄 index.html           (Bắt buộc phải đặt tên index.html)
        ├── 📄 index.js
        ├── 📄 index.wasm
        └── 📄 index.pck`
    : `└── 📁 assets/
    └── 📁 src/                     (Thư mục chứa source code, 3D model, audio... giao cho khách hàng)`
}`}
                </pre>
              </div>

              {/* Folder Component Descriptions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 space-y-1.5">
                  <h4 className="font-bold text-sky-500 flex items-center gap-1.5">
                    📁 thumbnail/
                  </h4>
                  <p className="text-slate-600 dark:text-slate-400">
                    Chứa 1 tệp ảnh đại diện duy nhất (đặt tên <code className="font-mono text-slate-800 dark:text-slate-200 font-bold">thumbnail.png</code> hoặc <code className="font-mono text-slate-800 dark:text-slate-200 font-bold">thumbnail.jpg</code>). Kích thước khuyến nghị 1280x720.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 space-y-1.5">
                  <h4 className="font-bold text-sky-500 flex items-center gap-1.5">
                    📁 screenshots/
                  </h4>
                  <p className="text-slate-600 dark:text-slate-400">
                    Chứa các ảnh chụp màn hình game/asset. Sau khi upload, bạn có thể kéo thả trực tiếp để sắp xếp lại thứ tự hiển thị ảnh.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 space-y-1.5">
                  <h4 className="font-bold text-emerald-500 flex items-center gap-1.5">
                    📁 web_demo/html5_files/
                  </h4>
                  <p className="text-slate-600 dark:text-slate-400">
                    Dành cho Game Web Demo. Đảm bảo file khởi chạy tên là <code className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">index.html</code> để hệ thống tự động nhúng vào trình phát Web Demo.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 space-y-1.5">
                  <h4 className="font-bold text-amber-500 flex items-center gap-1.5">
                    📁 assets/src/
                  </h4>
                  <p className="text-slate-600 dark:text-slate-400">
                    Dành cho Marketplace Asset. Chứa bộ file nguồn dự án (`.godot`, `.tscn`, `.gd`, `.png`, `.wav`...) mà khách hàng sẽ tải về khi mua.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY & TIPS */}
          {activeTab === "tips" && (
            <div className="space-y-6 text-sm leading-relaxed animate-fade-in">
              <div className="space-y-4">
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="text-emerald-500" size={20} /> Quy Trình Kiểm Định & Quét Bảo Mật Tự Động
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 space-y-2">
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      1. Quét An Toàn Sandbox
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 leading-normal">
                      Tệp ZIP tải lên được tự động phân tích qua sandbox bảo mật ClamAV để phát hiện mã độc hoặc tệp tin nghi vấn.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 space-y-2">
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      2. Phòng Chống Zip Slip / Bomb
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 leading-normal">
                      Hệ thống tự động kiểm soát tỉ lệ nén và cấu trúc đường dẫn để đảm bảo an toàn tuyệt đối cho hệ thống.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 space-y-2">
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      3. Phân Tách & Hiển Thị Tự Động
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 leading-normal">
                      Các tệp ảnh, video trailer và bản Web HTML5 sẽ được trích xuất tự động và cập nhật tức thì trên trang sản phẩm.
                    </p>
                  </div>
                </div>
              </div>

              {/* Best Practice Tips */}
              <div className="p-5 rounded-2xl border border-amber-300/40 bg-amber-50/50 dark:border-amber-500/20 dark:bg-amber-950/20 space-y-3 text-xs">
                <h4 className="font-bold text-amber-700 dark:text-amber-300 text-sm flex items-center gap-1.5">
                  💡 Mẹo Giúp Game Thu Hút Nhiều Lượt Chơi & Doanh Thu Nhất:
                </h4>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-700 dark:text-slate-300">
                  <li><strong>Có bản Web Demo:</strong> Các dự án có bản chơi thử Web Demo trực tiếp trên trình duyệt nhận được lượt tương tác và tỷ lệ tải mua gấp 5 lần so với sản phẩm chỉ có ảnh.</li>
                  <li><strong>Hình ảnh sắc nét:</strong> Thiết kế thumbnail có tương phản tốt, thể hiện màu sắc đặc trưng của dự án.</li>
                  <li><strong>Mô tả chi tiết:</strong> Ghi rõ phiên bản Godot tương thích (ví dụ: Godot 4.2+ Forward+), các phím điều khiển (WASD, Phím cách, Chuột) để người chơi dễ trải nghiệm.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-200/80 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-500" />
            Cần hỗ trợ thêm? Đội ngũ GodotLaunch luôn sẵn sàng giải đáp!
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={onClose}
            className="!rounded-xl px-5 cursor-pointer"
          >
            Đã Hiểu, Quay Lại Upload
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
