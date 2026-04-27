import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage, useUser, API } from '../App';
import axios from 'axios';
import usePuterAI from '../hooks/usePuterAI';
import {
  Sprout, LogOut, Cloud, Droplets, Wind, Gauge,
  ThermometerSun, AlertTriangle, CheckCircle, Info,
  TrendingUp, Calendar, MapPin, Bell, MessageSquare, PhoneCall,
  Brain, Sparkles
} from 'lucide-react';
import LanguageSelector from './LanguageSelector';

const FarmerDashboard = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user, logout } = useUser();
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notificationStatus, setNotificationStatus] = useState(null);
  const [sendingNotification, setSendingNotification] = useState(false);

  // Puter.js AI
  const {
    recommendation: aiRecommendation,
    loading: aiLoading,
    error: aiError,
    generateCropRecommendation
  } = usePuterAI();

  useEffect(() => {
    if (!user) {
      navigate('/register');
      return;
    }
    fetchDashboardData();
    fetchNotificationStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchNotificationStatus = async () => {
    try {
      const response = await axios.get(`${API}/notifications/status`);
      setNotificationStatus(response.data);
    } catch (err) {
      console.error('Error fetching notification status:', err);
    }
  };

  const sendTestSMS = async () => {
    if (!user?.phone_number || !user?.sms_enabled) {
      alert('SMS notifications not enabled or no phone number registered');
      return;
    }

    try {
      setSendingNotification(true);
      const response = await axios.post(`${API}/notifications/sms/send`, {
        user_id: user.id,
        message_type: 'weather'
      });

      if (response.data.success) {
        alert('SMS sent successfully! Check your phone.');
      } else {
        alert(response.data.message || 'SMS service not configured yet. Add Twilio credentials.');
      }
    } catch (err) {
      console.error('Error sending SMS:', err);
      alert('Failed to send SMS. Please try again later.');
    } finally {
      setSendingNotification(false);
    }
  };

  const sendAutoAlerts = async () => {
    if (!user?.phone_number) {
      alert('No phone number registered. Update your profile.');
      return;
    }

    try {
      setSendingNotification(true);
      const response = await axios.post(`${API}/notifications/auto-alert/${user.id}`);

      if (response.data.sms_sent || response.data.voice_sent) {
        alert(`Alerts sent! SMS: ${response.data.sms_sent ? '✓' : '✗'}, Voice: ${response.data.voice_sent ? '✓' : '✗'}`);
      } else {
        alert(response.data.message || 'No alerts to send or service not configured.');
      }
    } catch (err) {
      console.error('Error sending auto alerts:', err);
      alert('Failed to send alerts. Please try again later.');
    } finally {
      setSendingNotification(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await axios.get(`${API}/recommendations/${user.id}`);
      const data = response.data;

      setWeather(data.weather);
      setForecast(data.forecast || []);
      setRecommendations(data.recommendations || []);
      setAlerts(data.alerts || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Unable to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGetAIAdvice = () => {
    if (weather && user?.crop_type) {
      generateCropRecommendation(user.crop_type, weather, language);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'alert-danger';
      case 'medium': return 'alert-warning';
      case 'low': return 'alert-success';
      default: return 'card bg-white';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'alert': return <AlertTriangle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'success': return <CheckCircle className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner"></div>
          <p className="text-lg">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12" data-testid="farmer-dashboard">
      {/* Header */}
      <header className="header-nav">
        <div className="container header-inner">
          <div className="dashboard-header">
            <div className="dashboard-user-info">
              <Sprout className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">{t('appName')}</h1>
                <p className="text-sm text-muted">{t('dashboard.welcome')}, {user?.name}!</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSelector />
              <button
                onClick={handleLogout}
                className="btn btn-danger flex items-center"
                data-testid="logout-btn"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span>{t('dashboard.logout')}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container py-8">
        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        {/* User Info Card */}
        <div className="profile-card">
          <div className="grid grid-cols-4 gap-4">
            <div className="flex items-center space-x-3">
              <MapPin className="w-6 h-6" />
              <div>
                <p className="text-sm">{t('register.location')}</p>
                <p className="font-semibold">{user?.location}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Sprout className="w-6 h-6" />
              <div>
                <p className="text-sm">{t('register.crop')}</p>
                <p className="font-semibold">{t(`crops.${user?.crop_type}`)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Calendar className="w-6 h-6" />
              <div>
                <p className="text-sm">{t('dashboard.lastUpdated') || 'Last Updated'}</p>
                <p className="font-semibold">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Weather Alerts */}
        {alerts.length > 0 && (
          <div className="mb-8" data-testid="alerts-section">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <AlertTriangle className="w-6 h-6 text-danger mr-2" />
              {t('alerts.title')}
            </h2>
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <div key={index} className="alert alert-danger" data-testid={`alert-${index}`}>
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-danger mt-1 mr-3" />
                    <div>
                      <p className="font-semibold">{alert.type}</p>
                      <p>{alert.message}</p>
                      <p className="text-sm mt-1">{alert.date}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 mb-8">
          {/* Current Weather */}
          <div className="card" data-testid="current-weather">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <Cloud className="w-6 h-6 text-primary mr-2" />
              {t('dashboard.currentWeather')}
            </h2>
            {weather ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-5xl font-bold">{Math.round(weather.temperature)}°C</p>
                    <p className="text-lg text-muted capitalize">{weather.description}</p>
                    {weather.mock && (
                      <p className="text-xs text-warning mt-1">(Demo Data - Add API Key)</p>
                    )}
                  </div>
                  <img
                    src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                    alt="weather icon"
                    className="w-24 h-24"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <ThermometerSun className="w-5 h-5 text-warning" />
                    <div>
                      <p className="text-sm text-muted">{t('weather.feelsLike')}</p>
                      <p className="font-semibold">{Math.round(weather.feels_like)}°C</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Droplets className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted">{t('weather.humidity')}</p>
                      <p className="font-semibold">{weather.humidity}%</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Wind className="w-5 h-5 text-muted" />
                    <div>
                      <p className="text-sm text-muted">{t('weather.windSpeed')}</p>
                      <p className="font-semibold">{weather.wind_speed} m/s</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Gauge className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted">{t('weather.pressure')}</p>
                      <p className="font-semibold">{weather.pressure} hPa</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted">{t('weather.error')}</p>
            )}
          </div>

          {/* 5-Day Forecast */}
          <div className="card" data-testid="weather-forecast">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <TrendingUp className="w-6 h-6 text-primary mr-2" />
              {t('dashboard.forecast')}
            </h2>
            {forecast.length > 0 ? (
              <div className="space-y-3">
                {forecast.map((day, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 card"
                    data-testid={`forecast-day-${index}`}
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={`https://openweathermap.org/img/wn/${day.icon}.png`}
                        alt="weather"
                        className="w-10 h-10"
                      />
                      <div>
                        <p className="font-medium">
                          {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-sm text-muted capitalize">{day.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{Math.round(day.temperature)}°C</p>
                      <p className="text-sm text-primary">{Math.round(day.rain_probability)}% rain</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted">{t('weather.error')}</p>
            )}
          </div>
        </div>

        {/* Recommendations */}
        <div className="card mb-8" data-testid="recommendations-section">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <CheckCircle className="w-6 h-6 text-success mr-2" />
            {t('recommendations.title')}
          </h2>
          {recommendations.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {recommendations.map((rec, index) => (
                <div
                  key={rec.id}
                  className={`alert ${getSeverityColor(rec.severity)}`}
                  data-testid={`recommendation-${index}`}
                >
                  <div className="flex items-start space-x-3 w-full">
                    <div className="mt-1">{getPriorityIcon(rec.priority)}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="badge">
                          {t(`recommendations.${rec.category}`)}
                        </span>
                        <span className="text-xs">
                          {t(`recommendations.${rec.severity}`)}
                        </span>
                      </div>
                      <p className="text-sm">{rec.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted">{t('recommendations.noData')}</p>
          )}
        </div>

        {/* ============= PUTER.JS AI RECOMMENDATIONS ============= */}
        <div className="card mb-8" data-testid="ai-recommendations" style={{ borderTop: '4px solid #7B1FA2' }}>
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <Brain className="w-6 h-6 mr-2" style={{ color: '#7B1FA2' }} />
            <Sparkles className="w-5 h-5 mr-1" style={{ color: '#F57C00' }} />
            AI-Powered Crop Advice
          </h2>
          <p className="text-muted mb-4">
            Get personalized farming advice powered by artificial intelligence, based on your crop and current weather.
          </p>

          <button
            onClick={handleGetAIAdvice}
            disabled={aiLoading || !weather}
            className="btn flex items-center mb-4"
            style={{ backgroundColor: '#7B1FA2', color: 'white' }}
            data-testid="get-ai-advice-btn"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            {aiLoading ? 'Analyzing...' : 'Get AI-Powered Advice'}
          </button>

          {aiLoading && (
            <div className="flex items-center space-x-3 p-4 card" style={{ background: '#F3E5F5' }}>
              <div className="spinner" style={{ width: '32px', height: '32px', borderWidth: '3px', borderLeftColor: '#7B1FA2' }}></div>
              <p className="text-sm">AI is analyzing your crop and weather data...</p>
            </div>
          )}

          {aiError && (
            <div className="alert alert-danger">
              <AlertTriangle className="w-5 h-5 mr-2" />
              {aiError}
            </div>
          )}

          {aiRecommendation && !aiLoading && (
            <div className="card p-4" style={{ background: 'linear-gradient(135deg, #F3E5F5, #E8EAF6)', border: '1px solid #CE93D8' }} data-testid="ai-result">
              <div className="flex items-start space-x-3">
                <Brain className="w-6 h-6 mt-1" style={{ color: '#7B1FA2', flexShrink: 0 }} />
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7' }}>
                  {aiRecommendation}
                </div>
              </div>
              <p className="text-xs text-muted mt-4" style={{ fontStyle: 'italic' }}>
                ⓘ This advice is AI-generated and should be used as guidance. Always consult local agricultural experts for critical decisions.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default FarmerDashboard;
