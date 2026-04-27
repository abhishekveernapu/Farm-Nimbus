import { useLanguage } from '../App';
import { Globe } from 'lucide-react';

const LanguageSelector = () => {
  const { language, setLanguage } = useLanguage();

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
    { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
    { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
    { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳' },
    { code: 'ml', name: 'മലയാളം', flag: '🇮🇳' }
  ];

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} data-testid="language-selector">
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="form-select"
        style={{ 
          paddingRight: '2.5rem', 
          appearance: 'none', 
          WebkitAppearance: 'none', 
          minHeight: '40px',
          paddingTop: '0.5rem',
          paddingBottom: '0.5rem'
        }}
        data-testid="language-select"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
      <Globe 
        className="text-muted" 
        style={{ 
          position: 'absolute', 
          right: '0.5rem', 
          top: '50%', 
          transform: 'translateY(-50%)', 
          width: '1rem', 
          height: '1rem', 
          pointerEvents: 'none' 
        }} 
      />
    </div>
  );
};

export default LanguageSelector;
