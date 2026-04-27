import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage, useExpert, API } from '../App';
import axios from 'axios';
import {
  Sprout, Users, TrendingUp, MapPin, Wheat,
  BarChart3, Home, RefreshCw, Send, MessageSquare,
  AlertTriangle, CheckCircle, LogOut
} from 'lucide-react';
import LanguageSelector from './LanguageSelector';

const ExpertDashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isExpertAuthenticated, expertLogout } = useExpert();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Send Alert state
  const [farmers, setFarmers] = useState([]);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertTarget, setAlertTarget] = useState('all');
  const [sendingAlert, setSendingAlert] = useState(false);
  const [alertResult, setAlertResult] = useState(null);

  // Auto-alert state
  const [runningAutoCheck, setRunningAutoCheck] = useState(false);
  const [autoCheckResult, setAutoCheckResult] = useState(null);

  useEffect(() => {
    if (!isExpertAuthenticated) {
      navigate('/expert/login');
      return;
    }
    fetchExpertData();
    fetchFarmers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpertAuthenticated, navigate]);

  const getExpertHeaders = () => {
    const token = localStorage.getItem('farm_nimbus_expert_token');
    return { Authorization: `Bearer ${token}` };
  };

  const fetchExpertData = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`${API}/dashboard/expert`, {
        headers: getExpertHeaders()
      });
      setDashboardData(response.data);
    } catch (err) {
      console.error('Error fetching expert dashboard:', err);
      if (err.response?.status === 401) {
        expertLogout();
        navigate('/expert/login');
        return;
      }
      setError('Unable to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchFarmers = async () => {
    try {
      const response = await axios.get(`${API}/users`, {
        headers: getExpertHeaders()
      });
      setFarmers(response.data.users || []);
    } catch (err) {
      console.error('Error fetching farmers:', err);
    }
  };

  const handleSendAlert = async () => {
    if (!alertMessage.trim()) {
      setAlertResult({ success: false, message: 'Please enter a message.' });
      return;
    }

    setSendingAlert(true);
    setAlertResult(null);

    try {
      const response = await axios.post(`${API}/notifications/expert/send-alert`, {
        message: alertMessage,
        target: alertTarget
      }, { headers: getExpertHeaders() });

      setAlertResult(response.data);
      if (response.data.success) {
        setAlertMessage('');
      }
    } catch (err) {
      console.error('Error sending alert:', err);
      setAlertResult({
        success: false,
        message: err.response?.data?.detail || 'Failed to send alert.'
      });
    } finally {
      setSendingAlert(false);
    }
  };

  const handleAutoCheck = async () => {
    setRunningAutoCheck(true);
    setAutoCheckResult(null);
    try {
      const response = await axios.post(`${API}/alerts/auto-check`, {}, {
        headers: getExpertHeaders()
      });
      setAutoCheckResult(response.data);
    } catch (err) {
      setAutoCheckResult({
        success: false,
        message: err.response?.data?.detail || 'Auto-check failed.'
      });
    } finally {
      setRunningAutoCheck(false);
    }
  };

  const handleExpertLogout = () => {
    expertLogout();
    navigate('/');
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
    <div className="min-h-screen pb-12" data-testid="expert-dashboard">
      {/* Header */}
      <header className="header-nav">
        <div className="container header-inner flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Sprout className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">{t('appName')}</h1>
              <p className="text-sm text-muted">{t('dashboard.expertDashboard')}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={fetchExpertData}
              className="btn btn-secondary flex items-center"
              data-testid="refresh-btn"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              <span>Refresh</span>
            </button>
            <LanguageSelector />
            <button
              onClick={() => navigate('/')}
              className="btn flex items-center"
              style={{ backgroundColor: '#4A5568', color: 'white' }}
              data-testid="home-btn"
            >
              <Home className="w-4 h-4 mr-2" />
              <span>Home</span>
            </button>
            <button
              onClick={handleExpertLogout}
              className="btn btn-danger flex items-center"
              data-testid="expert-logout-btn"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="container py-8">
        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        {dashboardData && (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-4 mb-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              <div className="card-primary-gradient p-6 rounded-2xl shadow-lg" style={{ background: 'linear-gradient(135deg, #1976D2, #1565C0)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">Total Farmers</p>
                    <p className="text-4xl font-bold mt-2">{dashboardData.total_users}</p>
                  </div>
                  <Users className="w-12 h-12" style={{ opacity: 0.8 }} />
                </div>
              </div>

              <div className="card-primary-gradient p-6 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">Recommendations Sent</p>
                    <p className="text-4xl font-bold mt-2">{dashboardData.recent_recommendations?.length || 0}</p>
                  </div>
                  <TrendingUp className="w-12 h-12" style={{ opacity: 0.8 }} />
                </div>
              </div>

              <div className="card-primary-gradient p-6 rounded-2xl shadow-lg" style={{ background: 'linear-gradient(135deg, #7B1FA2, #6A1B9A)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">Crop Types</p>
                    <p className="text-4xl font-bold mt-2">
                      {Object.keys(dashboardData.crop_distribution || {}).length}
                    </p>
                  </div>
                  <Wheat className="w-12 h-12" style={{ opacity: 0.8 }} />
                </div>
              </div>
            </div>

            {/* ============= SEND ALERT SECTION ============= */}
            <div className="card mb-8" data-testid="send-alert-section" style={{ borderTop: '4px solid #E65100' }}>
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <Send className="w-6 h-6 mr-2" style={{ color: '#E65100' }} />
                Send Farmer Alert
              </h2>
              <p className="text-muted mb-4">
                Send a custom SMS alert to one or all registered farmers.
              </p>

              <div className="space-y-4">
                {/* Target Selection */}
                <div className="form-group">
                  <label className="form-label">Send To</label>
                  <select
                    value={alertTarget}
                    onChange={(e) => setAlertTarget(e.target.value)}
                    className="form-select"
                    data-testid="alert-target-select"
                  >
                    <option value="all">📢 All Farmers with SMS Enabled</option>
                    {farmers.filter(f => f.phone_number && f.sms_enabled).map(farmer => (
                      <option key={farmer.id} value={farmer.id}>
                        👤 {farmer.name} — {farmer.location} ({farmer.phone_number})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Message Input */}
                <div className="form-group">
                  <label className="form-label">Alert Message</label>
                  <textarea
                    value={alertMessage}
                    onChange={(e) => setAlertMessage(e.target.value)}
                    placeholder="Type your alert message here... (e.g., Heavy rain expected tomorrow. Ensure drainage and cover crops.)"
                    className="form-input"
                    style={{ minHeight: '120px', resize: 'vertical' }}
                    maxLength={500}
                    data-testid="alert-message-input"
                  />
                  <p className="text-sm text-muted mt-1">{alertMessage.length}/500 characters</p>
                </div>

                {/* Send Button */}
                <button
                  onClick={handleSendAlert}
                  disabled={sendingAlert || !alertMessage.trim()}
                  className="btn btn-primary flex items-center"
                  data-testid="send-alert-btn"
                  style={{ backgroundColor: '#E65100' }}
                >
                  <MessageSquare className="w-5 h-5 mr-2" />
                  {sendingAlert ? 'Sending...' : 'Send SMS Alert'}
                </button>

                {/* Result */}
                {alertResult && (
                  <div className={`alert ${alertResult.success ? 'alert-success' : 'alert-danger'}`} data-testid="alert-result">
                    {alertResult.success ? (
                      <div className="flex items-start">
                        <CheckCircle className="w-5 h-5 mr-2 mt-1" />
                        <div>
                          <p className="font-semibold">Alert sent successfully!</p>
                          <p className="text-sm">
                            Sent: {alertResult.sent_count || 0} | Failed: {alertResult.failed_count || 0}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start">
                        <AlertTriangle className="w-5 h-5 mr-2 mt-1" />
                        <p>{alertResult.message || 'Failed to send alert.'}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ============= AUTO WEATHER CHECK ============= */}
            <div className="card mb-8" data-testid="auto-check-section" style={{ borderTop: '4px solid #1976D2' }}>
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <AlertTriangle className="w-6 h-6 mr-2" style={{ color: '#1976D2' }} />
                Automated Weather Alert Check
              </h2>
              <p className="text-muted mb-4">
                Manually trigger a weather check for all farmers. If severe weather is detected, SMS alerts will be sent automatically.
              </p>
              <button
                onClick={handleAutoCheck}
                disabled={runningAutoCheck}
                className="btn btn-primary flex items-center"
                data-testid="auto-check-btn"
              >
                <RefreshCw className={`w-5 h-5 mr-2 ${runningAutoCheck ? 'animate-pulse' : ''}`} />
                {runningAutoCheck ? 'Checking...' : 'Run Weather Check Now'}
              </button>
              {autoCheckResult && (
                <div className={`alert mt-4 ${autoCheckResult.alerts_sent > 0 ? 'alert-warning' : 'alert-success'}`}>
                  <p className="font-semibold">
                    {autoCheckResult.alerts_sent > 0
                      ? `⚠️ ${autoCheckResult.alerts_sent} alert(s) sent to farmers`
                      : '✅ No severe weather detected. No alerts needed.'}
                  </p>
                  <p className="text-sm mt-1">Checked {autoCheckResult.farmers_checked || 0} farmer(s)</p>
                </div>
              )}
            </div>

            {/* Crop Distribution */}
            <div className="card mb-8" data-testid="crop-distribution">
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <BarChart3 className="w-6 h-6 text-primary mr-2" />
                Crop Distribution
              </h2>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                {Object.entries(dashboardData.crop_distribution || {}).map(([crop, count]) => (
                  <div
                    key={crop}
                    className="card"
                    style={{ background: '#E8F5E9', borderColor: '#C8E6C9', padding: '1rem' }}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <Wheat className="w-5 h-5 text-primary" />
                      <p className="font-semibold">{t(`crops.${crop}`)}</p>
                    </div>
                    <p className="text-3xl font-bold text-primary">{count}</p>
                    <p className="text-sm text-muted">farmers</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Location Distribution */}
            <div className="card mb-8" data-testid="location-distribution">
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <MapPin className="w-6 h-6 text-primary mr-2" />
                Location Distribution
              </h2>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {Object.entries(dashboardData.location_distribution || {}).map(([location, count]) => (
                  <div
                    key={location}
                    className="card"
                    style={{ background: '#E3F2FD', borderColor: '#BBDEFB', padding: '1rem' }}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <MapPin className="w-5 h-5" style={{ color: '#1976D2' }} />
                      <p className="font-semibold">{location}</p>
                    </div>
                    <p className="text-3xl font-bold" style={{ color: '#1976D2' }}>{count}</p>
                    <p className="text-sm text-muted">farmers</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Recommendations */}
            <div className="card" data-testid="recent-recommendations">
              <h2 className="text-2xl font-bold mb-4">Recent Recommendations</h2>
              {dashboardData.recent_recommendations && dashboardData.recent_recommendations.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.recent_recommendations.map((rec, index) => (
                    <div key={index} className="card p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold">User ID: {rec.user_id}</p>
                          <p className="text-sm text-muted mt-1">
                            {rec.recommendations?.length || 0} recommendations generated
                          </p>
                          <p className="text-sm text-muted">
                            {rec.alerts?.length || 0} alerts issued
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted">
                            {new Date(rec.timestamp).toLocaleString()}
                          </p>
                          <p className="text-sm font-medium mt-1 text-primary">
                            {rec.weather?.location || 'Unknown Location'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted">No recent recommendations available</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ExpertDashboard;
