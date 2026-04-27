import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import RegistrationForm from './components/RegistrationForm';
import FarmerDashboard from './components/FarmerDashboard';
import ExpertDashboard from './components/ExpertDashboard';
import ExpertLoginPage from './components/ExpertLoginPage';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

// ============= Axios Auth Interceptor =============
// Attach JWT token to all outgoing requests automatically
axios.interceptors.request.use(
  (config) => {
    // Prefer expert token for expert API calls
    const expertToken = localStorage.getItem('farm_nimbus_expert_token');
    const token = localStorage.getItem('farm_nimbus_token');
    if (expertToken && config.url?.includes('/expert')) {
      config.headers.Authorization = `Bearer ${expertToken}`;
    } else if (expertToken && (config.url?.includes('/dashboard/expert') || config.url?.includes('/notifications/expert'))) {
      config.headers.Authorization = `Bearer ${expertToken}`;
    } else if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 responses globally — clear auth and redirect to login
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isExpertRequest = url.includes('/expert') || url.includes('/dashboard/expert') || url.includes('/alerts/auto-check');
      const publicPaths = ['/login', '/register', '/', '/expert/login'];

      if (isExpertRequest) {
        // Expert token issue — clear expert token only, go to expert login
        localStorage.removeItem('farm_nimbus_expert_token');
        if (!publicPaths.includes(window.location.pathname)) {
          window.location.href = '/expert/login';
        }
      } else {
        // Farmer token issue — clear farmer token
        localStorage.removeItem('farm_nimbus_token');
        localStorage.removeItem('farm_nimbus_user');
        if (!publicPaths.includes(window.location.pathname)) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);


// ============= Language Context (fetches from backend) =============
const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');
  const [translations, setTranslations] = useState({});
  const [translationsLoading, setTranslationsLoading] = useState(true);

  const fetchTranslations = useCallback(async (lang) => {
    try {
      setTranslationsLoading(true);
      const response = await axios.get(`${API}/translations/${lang}`);
      setTranslations(response.data);
    } catch (error) {
      console.error('Error fetching translations:', error);
      // Fallback: try English
      if (lang !== 'en') {
        try {
          const fallback = await axios.get(`${API}/translations/en`);
          setTranslations(fallback.data);
        } catch {
          console.error('Failed to load fallback translations');
        }
      }
    } finally {
      setTranslationsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTranslations(language);
  }, [language, fetchTranslations]);

  const t = useCallback((key) => {
    const keys = key.split('.');
    let value = translations;

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key; // Return key as fallback
      }
    }

    return value || key;
  }, [translations]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translationsLoading }}>
      {children}
    </LanguageContext.Provider>
  );
};

// ============= User Context =============
const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const registerUser = async (userData) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API}/users`, userData);
      const newUser = response.data;

      // After registration, auto-login to get a token
      const loginResponse = await axios.post(`${API}/auth/login`, {
        name: userData.name,
        location: userData.location
      });

      const { token, user: loggedInUser } = loginResponse.data;
      localStorage.setItem('farm_nimbus_token', token);
      localStorage.setItem('farm_nimbus_user', JSON.stringify(loggedInUser));
      setUser(loggedInUser);

      return { success: true, user: loggedInUser };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.response?.data?.detail || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  const loginUser = async (loginData) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API}/auth/login`, loginData);
      const { token, user: loggedInUser } = response.data;

      localStorage.setItem('farm_nimbus_token', token);
      localStorage.setItem('farm_nimbus_user', JSON.stringify(loggedInUser));
      setUser(loggedInUser);

      return { success: true, user: loggedInUser };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed. Please try again.'
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('farm_nimbus_user');
    localStorage.removeItem('farm_nimbus_token');
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('farm_nimbus_user');
    const savedToken = localStorage.getItem('farm_nimbus_token');
    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Error parsing saved user:', e);
        localStorage.removeItem('farm_nimbus_user');
        localStorage.removeItem('farm_nimbus_token');
      }
    }
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, registerUser, loginUser, logout, loading }}>
      {children}
    </UserContext.Provider>
  );
};

// ============= Expert Context =============
const ExpertContext = createContext();

export const useExpert = () => {
  const context = useContext(ExpertContext);
  if (!context) {
    throw new Error('useExpert must be used within ExpertProvider');
  }
  return context;
};

export const ExpertProvider = ({ children }) => {
  const [isExpertAuthenticated, setIsExpertAuthenticated] = useState(false);

  useEffect(() => {
    const expertToken = localStorage.getItem('farm_nimbus_expert_token');
    if (expertToken) {
      setIsExpertAuthenticated(true);
    }
  }, []);

  const expertLogin = async (secretKey) => {
    try {
      const response = await axios.post(`${API}/auth/expert-login`, {
        secret_key: secretKey
      });
      const { token } = response.data;
      localStorage.setItem('farm_nimbus_expert_token', token);
      setIsExpertAuthenticated(true);
      return { success: true };
    } catch (error) {
      console.error('Expert login error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Invalid secret key'
      };
    }
  };

  const expertLogout = () => {
    localStorage.removeItem('farm_nimbus_expert_token');
    setIsExpertAuthenticated(false);
  };

  return (
    <ExpertContext.Provider value={{ isExpertAuthenticated, expertLogin, expertLogout }}>
      {children}
    </ExpertContext.Provider>
  );
};

function App() {
  return (
    <div className="App min-h-screen">
      <LanguageProvider>
        <UserProvider>
          <ExpertProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegistrationForm />} />
                <Route path="/dashboard" element={<FarmerDashboard />} />
                <Route path="/expert/login" element={<ExpertLoginPage />} />
                <Route path="/expert" element={<ExpertDashboard />} />
              </Routes>
            </BrowserRouter>
          </ExpertProvider>
        </UserProvider>
      </LanguageProvider>
    </div>
  );
}

export { API };
export default App;
