import { useState, useCallback } from 'react';

/**
 * Custom React hook for Puter.js AI-powered crop recommendations.
 * Uses the free Puter.js AI chat API to analyze crop and weather data.
 */
const usePuterAI = () => {
  const [recommendation, setRecommendation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateCropRecommendation = useCallback(async (cropType, weatherData, language = 'en') => {
    if (!window.puter) {
      setError('Puter.js is not loaded. Please refresh the page.');
      return null;
    }

    setLoading(true);
    setError('');
    setRecommendation('');

    const langName = {
      en: 'English',
      hi: 'Hindi',
      te: 'Telugu',
      ta: 'Tamil',
      kn: 'Kannada'
    }[language] || 'English';

    const prompt = `You are an expert agricultural advisor for Indian farmers. Analyze the following data and provide actionable farming recommendations.

**Crop:** ${cropType}
**Current Weather:**
- Temperature: ${weatherData?.temperature ?? 'N/A'}°C (Feels like: ${weatherData?.feels_like ?? 'N/A'}°C)
- Humidity: ${weatherData?.humidity ?? 'N/A'}%
- Wind Speed: ${weatherData?.wind_speed ?? 'N/A'} m/s
- Conditions: ${weatherData?.description ?? 'N/A'}
- Location: ${weatherData?.location ?? 'N/A'}

Please provide:
1. **Irrigation advice** for today based on the weather
2. **Crop protection** tips if weather is adverse
3. **Pest/disease warning** if conditions favor outbreaks
4. **Best action** the farmer should take today

Keep your response concise (under 200 words), practical, and in ${langName}. Use simple language a farmer would understand. Include emoji for visual clarity.`;

    try {
      const response = await window.puter.ai.chat(prompt);
      const text = typeof response === 'string' ? response : response?.message?.content || response?.text || JSON.stringify(response);
      setRecommendation(text);
      return text;
    } catch (err) {
      console.error('Puter AI error:', err);
      setError('Unable to get AI recommendations. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const analyzeWeatherRisk = useCallback(async (weatherData, forecastData) => {
    if (!window.puter) return null;

    const forecastSummary = (forecastData || []).slice(0, 3).map(d =>
      `${d.date}: ${d.temperature}°C, ${d.description}, ${d.rain_probability}% rain, wind ${d.wind_speed}m/s`
    ).join('\n');

    const prompt = `Analyze this weather data for an Indian farming region and identify SEVERE WEATHER RISKS only.

**Current:** ${weatherData?.temperature}°C, ${weatherData?.description}, humidity ${weatherData?.humidity}%, wind ${weatherData?.wind_speed}m/s

**3-Day Forecast:**
${forecastSummary || 'Not available'}

Respond ONLY if there is a genuine severe weather risk (cyclone, heavy rain >80mm, extreme heat >45°C, frost <5°C, severe storm). 
If conditions are normal, respond with exactly: "NO_SEVERE_RISK"
If there IS a risk, respond with a brief alert message (under 100 words) suitable for SMS to a farmer.`;

    try {
      const response = await window.puter.ai.chat(prompt);
      const text = typeof response === 'string' ? response : response?.message?.content || response?.text || '';
      return text.includes('NO_SEVERE_RISK') ? null : text;
    } catch (err) {
      console.error('Puter AI weather risk analysis error:', err);
      return null;
    }
  }, []);

  return {
    recommendation,
    loading,
    error,
    generateCropRecommendation,
    analyzeWeatherRisk
  };
};

export default usePuterAI;
