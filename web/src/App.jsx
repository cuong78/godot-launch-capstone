import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { NotificationProvider } from "./context/NotificationContext";
import { CartProvider } from "./context/CartContext";
import Header from "./components/Header";
import Footer from "./components/Footer";
import NotificationDropdown from "./components/NotificationDropdown";
import CartDropdown from "./components/CartDropdown";
import Home from "./pages/Home";
import ProductDetail from "./pages/ProductDetail";
import Community from "./pages/Community";
import DevPortal from "./pages/DevPortal";
import DashboardComponent from "./components/DevPortal/Dashboard";
import MyGames from "./pages/MyGames";
import Analytics from "./pages/Analytics";
import Library from "./pages/Library";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Admin from "./pages/Admin";
import AdminFinance from "./pages/AdminFinance";
import AdminModeration from "./pages/AdminModeration";
import AdminLogs from "./pages/AdminLogs";

function App() {
  return (
    <NotificationProvider>
      <CartProvider>
        <Router>
          <div className="bg-surface-dim text-on-surface min-h-screen flex flex-col relative overflow-x-hidden dark">
            {/* Ambient Blurred Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1605806616949-1e87b487bc2a?q=80&w=3270&auto=format&fit=crop')] bg-cover bg-center opacity-20 blur-3xl saturate-200"></div>
              <div className="absolute inset-0 bg-gradient-to-b from-surface-dim/80 via-surface-dim/95 to-surface-dim"></div>
            </div>

            <Header />
            <NotificationDropdown />
            <CartDropdown />

            <div className="relative z-10">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/community" element={<Community />} />
              <Route path="/dev-portal" element={<DevPortal />}>
                <Route index element={<DashboardComponent />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="games" element={<MyGames />} />
              </Route>
              <Route path="/library" element={<Library />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/finance" element={<AdminFinance />} />
              <Route path="/admin/moderation" element={<AdminModeration />} />
              <Route path="/admin/logs" element={<AdminLogs />} />
            </Routes>
          </div>

            <Footer />
          </div>
        </Router>
      </CartProvider>
    </NotificationProvider>
  );
}

export default App;
