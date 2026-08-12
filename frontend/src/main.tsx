import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import { WebSocketProvider } from "./context/WebSocketContext.tsx";
import { FaceVerifyProvider } from "./context/FaceVerifyContext.tsx";
import { ToastProvider } from "./context/ToastContext.tsx";
import "./config/i18n";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ToastProvider>
      <AuthProvider>
        <WebSocketProvider>
          <FaceVerifyProvider>
            <App />
          </FaceVerifyProvider>
        </WebSocketProvider>
      </AuthProvider>
    </ToastProvider>
  </StrictMode>,
);
