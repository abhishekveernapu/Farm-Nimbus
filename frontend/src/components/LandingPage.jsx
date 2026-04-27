import { useNavigate } from 'react-router-dom';
import { useLanguage, useUser } from '../App';
import { Cloud, CloudRain, Sun, Wind, Sprout, Bell, Globe, Brain } from 'lucide-react';
import LanguageSelector from './LanguageSelector';

const LandingPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useUser();

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const features = [
    {
      icon: <CloudRain className="feature-icon text-primary" />,
      title: t('features.realtime.title'),
      desc: t('features.realtime.desc')
    },
    {
      icon: <Brain className="feature-icon text-primary" />,
      title: t('features.ai.title'),
      desc: t('features.ai.desc')
    },
    {
      icon: <Bell className="feature-icon text-warning" />,
      title: t('features.alerts.title'),
      desc: t('features.alerts.desc')
    },
    {
      icon: <Globe className="feature-icon text-success" />,
      title: t('features.multilingual.title'),
      desc: t('features.multilingual.desc')
    }
  ];

  return (
    <div className="min-h-screen" data-testid="landing-page">
      {/* Header */}
      <header className="header-nav">
        <div className="container header-inner flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Sprout className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">{t('appName')}</h1>
          </div>
          <div className="flex items-center space-x-4">
            <LanguageSelector />
            {user && (
              <button
                onClick={() => navigate('/dashboard')}
                className="btn btn-primary"
                data-testid="dashboard-btn"
              >
                {t('dashboard.welcome')}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section" data-testid="hero-section">
        <div className="container text-center">
          <div className="mb-8 flex justify-center space-x-4">
            <Sun className="w-16 h-16 text-warning animate-pulse" />
            <Cloud className="w-16 h-16 text-muted" />
            <Wind className="w-16 h-16 text-muted" />
          </div>
          <h2 className="hero-title">
            {t('hero.title')}
          </h2>
          <p className="hero-subtitle">
            {t('hero.subtitle')}
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={handleGetStarted}
              className="btn btn-primary text-xl"
              data-testid="get-started-btn"
            >
              {t('hero.cta')}
            </button>
            <button
              onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
              className="btn btn-secondary text-xl"
            >
              {t('hero.learnMore')}
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white" data-testid="features-section">
        <div className="container">
          <h3 className="text-4xl font-bold text-center mb-12">
            {t('features.title')}
          </h3>
          <div className="grid grid-cols-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="card card-hover text-center"
                data-testid={`feature-card-${index}`}
              >
                <div className="mb-4 flex justify-center">{feature.icon}</div>
                <h4 className="text-xl font-bold mb-2">{feature.title}</h4>
                <p className="text-muted">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 card-primary-gradient">
        <div className="container text-center">
          <h3 className="text-4xl font-bold mb-6">{t('appName')}</h3>
          <p className="text-xl mb-8">{t('tagline')}</p>
          <button
            onClick={handleGetStarted}
            className="btn bg-white text-primary"
            style={{ backgroundColor: '#fff', color: '#2E7D32' }}
            data-testid="cta-btn"
          >
            {t('hero.cta')}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container text-center">
          <p>&copy; 2026 {t('appName')}. All rights reserved.</p>
          <p className="mt-2 text-muted" style={{ color: '#aaa' }}>{t('tagline')}</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
