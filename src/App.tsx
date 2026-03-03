import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import HomePage from "@/pages/HomePage";
import ChatPage from "@/pages/ChatPage";
import ExercisesPage from "@/pages/ExercisesPage";
import GradeExercisePage from "@/pages/GradeExercisePage";
import AIQuizPage from "@/pages/AIQuizPage";
import LessonTheoryPage from "@/pages/LessonTheoryPage";
import ProfilePage from "@/pages/ProfilePage";
import LeaderboardPage from "@/pages/LeaderboardPage";
import AboutPage from "@/pages/AboutPage";
import AdminSimulationsPage from "@/pages/AdminSimulationsPage";
import AdminTheoryPage from "@/pages/AdminTheoryPage";
import AdminExercisesPage from "@/pages/AdminExercisesPage";
import AdminVideosPage from "@/pages/AdminVideosPage";
import AdminStudentsPage from "@/pages/AdminStudentsPage";
import ExamPage from "@/pages/ExamPage";
import AuthPage from "@/pages/AuthPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, student, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user && !student) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <AppProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/" element={<HomePage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/exercises" element={<ExercisesPage />} />
                <Route path="/exercises/:grade" element={<GradeExercisePage />} />
                <Route path="/exercises/:grade/quiz" element={<AIQuizPage />} />
                <Route path="/exercises/:grade/theory" element={<LessonTheoryPage />} />
                <Route path="/exam" element={<ExamPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/admin" element={<AdminRoute><AdminSimulationsPage /></AdminRoute>} />
                <Route path="/admin/theory" element={<AdminRoute><AdminTheoryPage /></AdminRoute>} />
                <Route path="/admin/exercises" element={<AdminRoute><AdminExercisesPage /></AdminRoute>} />
                <Route path="/admin/students" element={<AdminRoute><AdminStudentsPage /></AdminRoute>} />
                <Route path="/admin/videos" element={<AdminRoute><AdminVideosPage /></AdminRoute>} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AppProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
