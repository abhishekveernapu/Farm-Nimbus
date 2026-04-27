import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage, useExpert } from '../App';
import { Sprout, Shield, KeyRound, ArrowLeft } from 'lucide-react';

const ExpertLoginPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { expertLogin, isExpertAuthenticated } = useExpert();
  const [secretKey, setSecretKey] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // If already authenticated, redirect to expert dashboard
  useEffect(() => {
    if (isExpertAuthenticated) {
      navigate('/expert');
    }
  }, [isExpertAuthenticated, navigate]);

  if (isExpertAuthenticated) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!secretKey.trim()) {
      setError('Please enter the expert secret key.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await expertLogin(secretKey);
      if (result.success) {
        navigate('/expert');
      } else {
        setError(result.error || 'Invalid secret key. Access denied.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center py-12" data-testid="expert-login-page">
      <div className="container" style={{ maxWidth: '450px' }}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center space-x-2 mb-4">
            <Sprout className="w-12 h-12 text-primary" />
            <h1 className="text-3xl font-bold">{t('appName')}</h1>
          </div>
          <div className="flex justify-center items-center space-x-2 mb-4">
            <Shield className="w-6 h-6" style={{ color: '#7B1FA2' }} />
            <p style={{ color: '#7B1FA2', fontWeight: 600, fontSize: '1.1rem' }}>
              Expert Access Portal
            </p>
          </div>
          <p className="text-muted">Authorized personnel only</p>
        </div>

        {/* Login Card */}
        <div className="card" style={{ borderTop: '4px solid #7B1FA2' }}>
          <h2 className="text-2xl font-bold mb-6 flex items-center justify-center">
            <KeyRound className="w-6 h-6 mr-2" style={{ color: '#7B1FA2' }} />
            Expert Authentication
          </h2>

          {error && (
            <div className="alert alert-danger" data-testid="expert-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-group">
              <label className="form-label">Secret Key</label>
              <div style={{ position: 'relative' }}>
                <KeyRound
                  className="w-5 h-5 text-muted"
                  style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="Enter expert secret key"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  data-testid="expert-key-input"
                  autoComplete="off"
                  required
                />
              </div>
              <p className="text-sm text-muted mt-2">
                Contact the system administrator to obtain your expert access key.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn w-full"
              style={{ backgroundColor: '#7B1FA2', color: 'white' }}
              data-testid="expert-login-btn"
            >
              {isLoading ? 'Authenticating...' : 'Access Expert Dashboard'}
            </button>
          </form>

          {/* Back */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-primary font-semibold flex items-center justify-center mx-auto"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              data-testid="expert-back-btn"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              {t('common.back')} to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpertLoginPage;
