import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { FaceVerifyModal } from '../components/FaceVerifyModal';

interface FaceVerifyContextType {
  requireFaceVerify: (onVerified: () => void) => void;
}

const FaceVerifyContext = createContext<FaceVerifyContextType | null>(null);

export const FaceVerifyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [onVerifiedCallback, setOnVerifiedCallback] = useState<(() => void) | null>(null);

  const requireFaceVerify = useCallback((onVerified: () => void) => {
    setOnVerifiedCallback(() => onVerified);
    setVisible(true);
  }, []);

  // Bắt event từ axios interceptor khi API trả về FACE_VERIFY_REQUIRED (403)
  useEffect(() => {
    const handler = () => {
      setOnVerifiedCallback(null);
      setVisible(true);
    };
    window.addEventListener('face-verify-required', handler);
    return () => window.removeEventListener('face-verify-required', handler);
  }, []);

  const handleSuccess = () => {
    setVisible(false);
    onVerifiedCallback?.();
  };

  const handleClose = () => {
    setVisible(false);
    setOnVerifiedCallback(null);
  };

  return (
    <FaceVerifyContext.Provider value={{ requireFaceVerify }}>
      {children}
      {visible && <FaceVerifyModal onSuccess={handleSuccess} onClose={handleClose} />}
    </FaceVerifyContext.Provider>
  );
};

export const useFaceVerify = (): FaceVerifyContextType => {
  const ctx = useContext(FaceVerifyContext);
  if (!ctx) throw new Error('useFaceVerify must be used within FaceVerifyProvider');
  return ctx;
};
