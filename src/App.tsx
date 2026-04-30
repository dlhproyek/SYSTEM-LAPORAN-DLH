import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Index from "./pages/Index";
import CreateReport from "./pages/CreateReport";
import EditReport from "./pages/EditReport";
import ReportDetail from "./pages/ReportDetail";
import PrintRekap from "./pages/PrintRekap";
import MonthlyRecap from "./pages/MonthlyRecap";
import DailyRecap from "./pages/DailyRecap";
import WeeklyRecap from "./pages/WeeklyRecap";
import Maintenance from "./pages/Maintenance";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Work Plan Pages
import WorkPlanList from "./pages/WorkPlanList";
import CreateWorkPlan from "./pages/CreateWorkPlan";
import EditWorkPlan from "./pages/EditWorkPlan";
import PrintWorkPlan from "./pages/PrintWorkPlan";
import WorkPlanDailyRecap from "./pages/WorkPlanDailyRecap";
import WorkPlanWeeklyRecap from "./pages/WorkPlanWeeklyRecap";
import WorkPlanMonthlyRecap from "./pages/WorkPlanMonthlyRecap";

// Fuel SPJ Pages
import FuelSpjList from "./pages/FuelSpjList";
import CreateFuelSpj from "./pages/CreateFuelSpj";
import EditFuelSpj from "./pages/EditFuelSpj";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { session, profile, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;
  if (!session) return <Navigate to="/login" />;
  
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" />;
  }
  
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Index />} />
            <Route path="/report/:id" element={<ReportDetail />} />
            <Route path="/monthly-rekap" element={<MonthlyRecap />} />
            <Route path="/daily-rekap" element={<DailyRecap />} />
            <Route path="/weekly-rekap" element={<WeeklyRecap />} />
            
            {/* Work Plan Routes */}
            <Route path="/work-plans" element={<WorkPlanList />} />
            <Route path="/work-plans/print/:id" element={<PrintWorkPlan />} />
            <Route path="/work-plans/daily-rekap" element={<WorkPlanDailyRecap />} />
            <Route path="/work-plans/weekly-rekap" element={<WorkPlanWeeklyRecap />} />
            <Route path="/work-plans/monthly-rekap" element={<WorkPlanMonthlyRecap />} />
            
            {/* Fuel SPJ Routes - Restricted to admin and spjbbm */}
            <Route path="/fuel-spj" element={<ProtectedRoute allowedRoles={['admin', 'spjbbm']}><FuelSpjList /></ProtectedRoute>} />
            <Route path="/fuel-spj/create" element={<ProtectedRoute allowedRoles={['admin', 'spjbbm']}><CreateFuelSpj /></ProtectedRoute>} />
            <Route path="/fuel-spj/edit/:id" element={<ProtectedRoute allowedRoles={['admin', 'spjbbm']}><EditFuelSpj /></ProtectedRoute>} />
            
            <Route path="/work-plans/create" element={<ProtectedRoute><CreateWorkPlan /></ProtectedRoute>} />
            <Route path="/work-plans/edit/:id" element={<ProtectedRoute><EditWorkPlan /></ProtectedRoute>} />
            
            <Route path="/create" element={<ProtectedRoute><CreateReport /></ProtectedRoute>} />
            <Route path="/edit/:id" element={<ProtectedRoute><EditReport /></ProtectedRoute>} />
            <Route path="/print-rekap" element={<ProtectedRoute><PrintRekap /></ProtectedRoute>} />
            <Route path="/maintenance" element={<ProtectedRoute allowedRoles={['admin']}><Maintenance /></ProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;