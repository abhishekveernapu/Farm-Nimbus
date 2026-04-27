import os
import requests
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

class WeatherService:
    def __init__(self):
        self.api_key = os.environ.get('OPENWEATHER_API_KEY', 'PLACEHOLDER_KEY')
        self.base_url = "https://api.openweathermap.org/data/2.5"
        self.cache = {}
        self.cache_duration = timedelta(minutes=30)
    
    def get_current_weather(self, location: str) -> Optional[Dict]:
        """Fetch current weather for a location"""
        try:
            cache_key = f"current_{location}"
            if self._is_cache_valid(cache_key):
                return self.cache[cache_key]['data']
            
            url = f"{self.base_url}/weather"
            params = {
                'q': location,
                'appid': self.api_key,
                'units': 'metric'
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            weather_data = {
                'location': data['name'],
                'country': data['sys']['country'],
                'temperature': data['main']['temp'],
                'feels_like': data['main']['feels_like'],
                'humidity': data['main']['humidity'],
                'pressure': data['main']['pressure'],
                'wind_speed': data['wind']['speed'],
                'weather': data['weather'][0]['main'],
                'description': data['weather'][0]['description'],
                'icon': data['weather'][0]['icon'],
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            self.cache[cache_key] = {
                'data': weather_data,
                'timestamp': datetime.now(timezone.utc)
            }
            
            return weather_data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching weather data: {e}")
            return self._get_mock_current_weather(location)
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return self._get_mock_current_weather(location)
    
    def get_forecast(self, location: str) -> Optional[List[Dict]]:
        """Fetch 5-day weather forecast"""
        try:
            cache_key = f"forecast_{location}"
            if self._is_cache_valid(cache_key):
                return self.cache[cache_key]['data']
            
            url = f"{self.base_url}/forecast"
            params = {
                'q': location,
                'appid': self.api_key,
                'units': 'metric'
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            # Process forecast data (one per day at noon)
            daily_forecast = []
            seen_dates = set()
            
            for item in data['list']:
                date = datetime.fromtimestamp(item['dt']).date()
                hour = datetime.fromtimestamp(item['dt']).hour
                
                # Get one forecast per day around noon
                if date not in seen_dates and 11 <= hour <= 14:
                    daily_forecast.append({
                        'date': date.isoformat(),
                        'temperature': item['main']['temp'],
                        'temp_min': item['main']['temp_min'],
                        'temp_max': item['main']['temp_max'],
                        'humidity': item['main']['humidity'],
                        'weather': item['weather'][0]['main'],
                        'description': item['weather'][0]['description'],
                        'icon': item['weather'][0]['icon'],
                        'wind_speed': item['wind']['speed'],
                        'rain_probability': item.get('pop', 0) * 100
                    })
                    seen_dates.add(date)
                
                if len(daily_forecast) >= 5:
                    break
            
            self.cache[cache_key] = {
                'data': daily_forecast,
                'timestamp': datetime.now(timezone.utc)
            }
            
            return daily_forecast
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching forecast: {e}")
            return self._get_mock_forecast(location)
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return self._get_mock_forecast(location)
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        """Check if cached data is still valid"""
        if cache_key not in self.cache:
            return False
        
        cache_time = self.cache[cache_key]['timestamp']
        return datetime.now(timezone.utc) - cache_time < self.cache_duration
    
    def _get_mock_current_weather(self, location: str) -> Dict:
        """Return mock weather data when API is unavailable"""
        return {
            'location': location,
            'country': 'IN',
            'temperature': 28.5,
            'feels_like': 30.2,
            'humidity': 65,
            'pressure': 1012,
            'wind_speed': 3.5,
            'weather': 'Clouds',
            'description': 'scattered clouds',
            'icon': '03d',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'mock': True
        }
    
    def _get_mock_forecast(self, location: str) -> List[Dict]:
        """Return mock forecast data when API is unavailable"""
        forecast = []
        for i in range(5):
            date = datetime.now(timezone.utc).date() + timedelta(days=i+1)
            forecast.append({
                'date': date.isoformat(),
                'temperature': 27 + i,
                'temp_min': 22 + i,
                'temp_max': 32 + i,
                'humidity': 60 + i * 2,
                'weather': 'Clear' if i % 2 == 0 else 'Clouds',
                'description': 'clear sky' if i % 2 == 0 else 'few clouds',
                'icon': '01d' if i % 2 == 0 else '02d',
                'wind_speed': 3.0 + i * 0.5,
                'rain_probability': 10 + i * 5,
                'mock': True
            })
        return forecast
