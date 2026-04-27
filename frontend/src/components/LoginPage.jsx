import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage, useUser } from '../App';
import { Sprout, LogIn, UserPlus, Phone, MapPin } from 'lucide-react';
import LanguageSelector from './LanguageSelector';

const LoginPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { loginUser, loading } = useUser();
  const [loginMethod, setLoginMethod] = useState('phone'); // 'phone' or 'location'
  const [formData, setFormData] = useState({
    phone_number: '',
    name: '',
    location: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Build login payload based on method
      let loginData = {};
      
      if (loginMethod === 'phone' && formData.phone_number) {
        loginData = { phone_number: formData.phone_number };
      } else if (loginMethod === 'location' && formData.name && formData.location) {
        loginData = { name: formData.name, location: formData.location };
      } else {
        setError('Please fill in all required fields.');
        setIsLoading(false);
        return;
      }

      // Use the server-side login endpoint via UserProvider
      const result = await loginUser(loginData);

      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'User not found. Please check your details or register.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center py-12" data-testid="login-page">
      <div className="container" style={{ maxWidth: '450px' }}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center space-x-2 mb-4">
            <Sprout className="w-12 h-12 text-primary" />
            <h1 className="text-3xl font-bold">{t('appName')}</h1>
          </div>
          <div className="flex justify-center mb-4">
            <LanguageSelector />
          </div>
          <p className="text-muted">{t('tagline')}</p>
        </div>

        {/* Login Form */}
        <div className="card">
          <h2 className="text-2xl font-bold mb-6 flex items-center justify-center">
            <LogIn className="w-6 h-6 mr-2" />
            {t('common.login')}
          </h2>

          {/* Login Method Toggle */}
          <div className="flex mb-6 p-1" style={{ backgroundColor: 'var(--bg-surface-alt)', borderRadius: 'var(--radius-md)' }}>
            <button
              type="button"
              onClick={() => setLoginMethod('phone')}
              className="flex-1 py-2 px-4 rounded-md font-semibold text-center"
              style={{
                backgroundColor: loginMethod === 'phone' ? 'var(--bg-surface)' : 'transparent',
                color: loginMethod === 'phone' ? 'var(--primary)' : 'var(--text-muted)',
                boxShadow: loginMethod === 'phone' ? 'var(--shadow-sm)' : 'none',
                border: 'none', cursor: 'pointer'
              }}
              data-testid="phone-login-tab"
            >
              <Phone className="w-4 h-4" style={{ display: 'inline', marginRight: '0.5rem' }} />
              Phone
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('location')}
              className="flex-1 py-2 px-4 rounded-md font-semibold text-center"
              style={{
                backgroundColor: loginMethod === 'location' ? 'var(--bg-surface)' : 'transparent',
                color: loginMethod === 'location' ? 'var(--primary)' : 'var(--text-muted)',
                boxShadow: loginMethod === 'location' ? 'var(--shadow-sm)' : 'none',
                border: 'none', cursor: 'pointer'
              }}
              data-testid="location-login-tab"
            >
              <MapPin className="w-4 h-4" style={{ display: 'inline', marginRight: '0.5rem' }} />
              Name & Location
            </button>
          </div>

          {error && (
            <div className="alert alert-danger" data-testid="error-message">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            {loginMethod === 'phone' ? (
              /* Phone Login */
              <div className="form-group">
                <label className="form-label">{t('register.phone') || 'Phone Number'}</label>
                <div style={{ position: 'relative' }}>
                  <Phone className="w-5 h-5 text-muted" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder="+91 1234567890"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    data-testid="phone-login-input"
                    required
                  />
                </div>
                <p className="text-sm text-muted mt-2">{t('login.phoneHint') || 'Enter the phone number you registered with'}</p>
              </div>
            ) : (
              /* Name & Location Login */
              <>
                <div className="form-group">
                  <label className="form-label">{t('register.name')}</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('register.namePlaceholder')}
                    className="form-input"
                    data-testid="name-login-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('register.location')}</label>
                  <div style={{ position: 'relative' }}>
                    <MapPin className="w-5 h-5 text-muted" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder={t('register.locationPlaceholder')}
                      className="form-input"
                      style={{ paddingLeft: '2.5rem' }}
                      data-testid="location-login-input"
                      required
                    />
                  </div>
                  <p className="text-sm text-muted mt-2">{t('login.locationHint') || 'Enter the exact name and location you registered with'}</p>
                </div>
              </>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full"
              data-testid="login-submit-btn"
            >
              {isLoading ? (t('login.loggingIn') || 'Logging in...') : t('common.login')}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-muted mb-4">{t('login.noAccount') || "Don't have an account?"}</p>
            <button
              onClick={() => navigate('/register')}
              className="btn w-full flex items-center justify-center"
              style={{ backgroundColor: '#1976D2', color: 'white' }}
              data-testid="go-to-register-btn"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              <span>{t('login.registerNow') || 'Register Now'}</span>
            </button>
          </div>

          {/* Back to Home */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-primary font-semibold"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              data-testid="back-to-home-btn"
            >
              ← {t('common.back')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
