import { useCallback, useRef, useState } from "react";

/**
 * Input số tiền có format hiển thị (dấu phân cách hàng nghìn) — controlled
 * component set lại `value` mỗi lần gõ, điều này xung đột với IME tiếng
 * Việt (Unikey/EVKey): khi bật gõ tiếng Việt, trình duyệt bắn
 * compositionstart/compositionend quanh MỖI phím gõ (kể cả phím số), khác
 * với gõ ENG chỉ bắn input event đơn giản.
 *
 * Fix đầu tiên (giữ nguyên value thô trong lúc composing, chỉ sanitize sau
 * compositionend) gây bug khác: compositionend của IME tiếng Việt cho phím
 * số thường bắn rất trễ (đôi khi chỉ khi blur) — nên giá trị chưa sanitize
 * (vd "01") bị hiển thị treo cho tới lúc đó, đúng như trong ảnh chụp
 * ("nhập 1 ra 001, click ra ngoài mới nhảy về 1").
 *
 * Fix đúng: input số 0-9 không có "hình dạng đang gõ dở" cần IME bảo vệ
 * như chữ cái có dấu (ă, ư, ơ...) — vì vậy có thể sanitize+format NGAY
 * trong onChange bất kể đang composing hay không, mà không làm lệch con
 * trỏ. Chỉ khi giá trị đang composing chứa ký tự non-digit (trường hợp
 * hiếm, ví dụ IME đang giữ một ký tự trung gian trước khi chốt) mới tạm
 * hiển thị nguyên văn để không phá phiên gõ của IME.
 */
export function useFormattedAmountInput(
  sanitize: (raw: string) => string,
  format: (digits: string) => string,
  initial = "",
) {
  const [rawValue, setRawValue] = useState(() => sanitize(initial));
  const isComposing = useRef(false);
  const [displayOverride, setDisplayOverride] = useState<string | null>(null);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      if (isComposing.current && /[^\d.,\s]/.test(next)) {
        // IME đang giữ một ký tự trung gian chưa phải chữ số thuần (hiếm
        // với ô số) — không sanitize/format ngay để không phá phiên gõ,
        // chỉ hiển thị đúng những gì trình duyệt/IME đang giữ.
        setDisplayOverride(next);
        return;
      }
      setDisplayOverride(null);
      setRawValue(sanitize(next));
    },
    [sanitize],
  );

  const onCompositionStart = useCallback(() => {
    isComposing.current = true;
  }, []);

  const onCompositionEnd = useCallback(
    (e: React.CompositionEvent<HTMLInputElement>) => {
      isComposing.current = false;
      setDisplayOverride(null);
      setRawValue(sanitize(e.currentTarget.value));
    },
    [sanitize],
  );

  const setValue = useCallback(
    (raw: string) => {
      setDisplayOverride(null);
      setRawValue(sanitize(raw));
    },
    [sanitize],
  );

  return {
    /** Giá trị số thô (chỉ chữ số), dùng để submit/tính toán. */
    rawValue,
    setValue,
    inputProps: {
      value: displayOverride ?? format(rawValue),
      onChange,
      onCompositionStart,
      onCompositionEnd,
    },
  };
}
