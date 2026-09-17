import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import Login from './pages/Login';
import MapExplorer from './pages/MapExplorer';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Methodology from './pages/Methodology';
import Info from './pages/Info';
import EventDetails from './pages/EventDetails';
import AIAgent from './pages/AIAgent';
import Settings from './pages/Settings';
import Landing from './pages/Landing';
import Layout from './components/Layout';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Geospatial Map Explorer Console */}
        {/* Landing Page */}
        <Route path="/" element={<Landing />} />

        {/* Geospatial Map Explorer Console */}
        <Route 
          path="/map" 
          element={
            <ProtectedRoute>
              <div className="flex flex-col h-screen w-screen overflow-hidden text-gray-200 bg-gray-900 font-['Inter']">
                <MapExplorer />
              </div>
            </ProtectedRoute>
          } 
        />

        {/* Telemetry Dashboard */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } 
        />

        {/* Analytics Studio */}
        <Route 
          path="/analytics" 
          element={
            <ProtectedRoute>
              <Layout>
                <Analytics />
              </Layout>
            </ProtectedRoute>
          } 
        />

        {/* Methodology & Architectural Pipeline */}
        <Route 
          path="/methodology" 
          element={
            <ProtectedRoute>
              <Layout>
                <Methodology />
              </Layout>
            </ProtectedRoute>
          } 
        />

        {/* Agentic AI Co-Pilot Chat */}
        <Route 
          path="/ai-agent" 
          element={
            <ProtectedRoute>
              <Layout>
                <AIAgent />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/agent" 
          element={<Navigate to="/ai-agent" replace />} 
        />
        <Route 
          path="/info" 
          element={<Navigate to="/ai-agent" replace />} 
        />

        {/* System Settings */}
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <Layout>
                <Settings />
              </Layout>
            </ProtectedRoute>
          } 
        />

        {/* Event Detail View */}
        <Route 
          path="/event/:id" 
          element={
            <ProtectedRoute>
              <Layout>
                <EventDetails />
              </Layout>
            </ProtectedRoute>
          } 
        />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

