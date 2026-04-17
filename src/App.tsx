import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import AdminUsers from "./pages/AdminUsers";
import CreateReport from "./pages/CreateReport";
import EditReport from "./pages/EditReport";
import ReportDetail from "./pages/ReportDetail";
import MonthlyRekap from "./pages/MonthlyRekap";
import PrintRekap from "./pages/PrintRekap";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/create" element={<CreateReport />} />
            <Route path="/edit/:id" element={<EditReport />} />
            <Route path="/report/:id" element={<ReportDetail />} />
            <Route path="/monthly-rekap" element={<MonthlyRekap />} />
            <Route path="/print-rekap" element={<PrintRekap />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;