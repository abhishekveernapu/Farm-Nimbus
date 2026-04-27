from typing import Dict, List
from datetime import datetime, timezone

class AIRecommendationEngine:
    """Rule-based AI engine for crop-specific weather recommendations"""
    
    def __init__(self):
        self.crop_rules = self._initialize_crop_rules()
    
    def _initialize_crop_rules(self) -> Dict:
        """Initialize crop-specific thresholds and requirements"""
        return {
            'Rice': {
                'optimal_temp': (20, 35),
                'optimal_humidity': (70, 90),
                'water_requirement': 'high',
                'rain_tolerance': 'high',
                'growth_stages': ['nursery', 'transplanting', 'tillering', 'flowering', 'maturity']
            },
            'Wheat': {
                'optimal_temp': (12, 25),
                'optimal_humidity': (50, 70),
                'water_requirement': 'medium',
                'rain_tolerance': 'medium',
                'growth_stages': ['germination', 'tillering', 'jointing', 'flowering', 'maturity']
            },
            'Cotton': {
                'optimal_temp': (21, 30),
                'optimal_humidity': (60, 80),
                'water_requirement': 'high',
                'rain_tolerance': 'low',
                'growth_stages': ['germination', 'vegetative', 'flowering', 'boll_formation', 'maturity']
            },
            'Maize': {
                'optimal_temp': (18, 32),
                'optimal_humidity': (60, 75),
                'water_requirement': 'medium',
                'rain_tolerance': 'medium',
                'growth_stages': ['germination', 'vegetative', 'tasseling', 'silking', 'maturity']
            },
            'Sugarcane': {
                'optimal_temp': (20, 30),
                'optimal_humidity': (70, 85),
                'water_requirement': 'very_high',
                'rain_tolerance': 'high',
                'growth_stages': ['germination', 'tillering', 'grand_growth', 'maturity']
            },
            'Tomato': {
                'optimal_temp': (18, 27),
                'optimal_humidity': (60, 70),
                'water_requirement': 'medium',
                'rain_tolerance': 'low',
                'growth_stages': ['seedling', 'vegetative', 'flowering', 'fruiting', 'maturity']
            },
            'Potato': {
                'optimal_temp': (15, 25),
                'optimal_humidity': (60, 75),
                'water_requirement': 'medium',
                'rain_tolerance': 'low',
                'growth_stages': ['planting', 'vegetative', 'tuber_formation', 'maturity']
            },
            'Onion': {
                'optimal_temp': (13, 24),
                'optimal_humidity': (60, 70),
                'water_requirement': 'low',
                'rain_tolerance': 'low',
                'growth_stages': ['germination', 'vegetative', 'bulb_formation', 'maturity']
            },
            'Chili': {
                'optimal_temp': (20, 30),
                'optimal_humidity': (60, 75),
                'water_requirement': 'medium',
                'rain_tolerance': 'medium',
                'growth_stages': ['seedling', 'vegetative', 'flowering', 'fruiting', 'maturity']
            },
            'Groundnut': {
                'optimal_temp': (20, 30),
                'optimal_humidity': (60, 75),
                'water_requirement': 'low',
                'rain_tolerance': 'low',
                'growth_stages': ['germination', 'vegetative', 'pegging', 'pod_formation', 'maturity']
            }
        }
    
    def get_supported_crops(self) -> List[str]:
        """Return list of supported crop names"""
        return list(self.crop_rules.keys())
    
    def normalize_crop_type(self, crop_type: str) -> str:
        """Normalize crop type to match known keys (case-insensitive)"""
        crop_map = {name.lower(): name for name in self.crop_rules}
        return crop_map.get(crop_type.lower().strip(), crop_type)
    
    def generate_recommendations(self, weather_data: Dict, crop_type: str, language: str = 'en') -> List[Dict]:
        """Generate crop-specific recommendations based on weather"""
        recommendations = []
        
        if crop_type not in self.crop_rules:
            return [self._create_recommendation('general', 'info', 
                'Monitor weather conditions regularly', 'high', language)]
        
        crop = self.crop_rules[crop_type]
        temp = weather_data.get('temperature', 25)
        humidity = weather_data.get('humidity', 60)
        wind_speed = weather_data.get('wind_speed', 0)
        weather_condition = weather_data.get('weather', 'Clear')
        
        # Temperature-based recommendations
        if temp < crop['optimal_temp'][0]:
            recommendations.append(
                self._create_recommendation('temperature', 'warning',
                f'Temperature is below optimal for {crop_type}. Protect crops from cold stress.',
                'high', language)
            )
        elif temp > crop['optimal_temp'][1]:
            recommendations.append(
                self._create_recommendation('temperature', 'warning',
                f'High temperature detected. Increase irrigation frequency for {crop_type}.',
                'high', language)
            )
        else:
            recommendations.append(
                self._create_recommendation('temperature', 'success',
                f'Temperature is optimal for {crop_type} growth.',
                'low', language)
            )
        
        # Humidity-based recommendations
        if humidity < crop['optimal_humidity'][0]:
            recommendations.append(
                self._create_recommendation('humidity', 'warning',
                f'Low humidity. Increase irrigation for {crop_type}.',
                'medium', language)
            )
        elif humidity > crop['optimal_humidity'][1]:
            recommendations.append(
                self._create_recommendation('humidity', 'alert',
                f'High humidity may cause fungal diseases. Monitor {crop_type} closely.',
                'high', language)
            )
        
        # Rainfall/Weather recommendations
        if weather_condition in ['Rain', 'Drizzle', 'Thunderstorm']:
            if crop['rain_tolerance'] == 'low':
                recommendations.append(
                    self._create_recommendation('rainfall', 'alert',
                    f'Rain expected. Ensure proper drainage for {crop_type}. Delay irrigation.',
                    'high', language)
                )
            else:
                recommendations.append(
                    self._create_recommendation('rainfall', 'info',
                    f'Rain expected. Good for {crop_type}. Skip irrigation today.',
                    'low', language)
                )
        
        # Wind-based recommendations
        if wind_speed > 10:
            recommendations.append(
                self._create_recommendation('wind', 'warning',
                f'Strong winds expected. Provide support to {crop_type} plants if needed.',
                'medium', language)
            )
        
        # Irrigation recommendations
        irrigation_rec = self._get_irrigation_recommendation(
            temp, humidity, weather_condition, crop['water_requirement'], crop_type, language
        )
        recommendations.append(irrigation_rec)
        
        # Pest and disease recommendations
        if temp > 25 and humidity > 70:
            recommendations.append(
                self._create_recommendation('pest', 'warning',
                f'Weather conditions favorable for pests. Monitor {crop_type} and apply organic pesticides if needed.',
                'medium', language)
            )
        
        return recommendations
    
    def _get_irrigation_recommendation(self, temp: float, humidity: float, 
                                      weather: str, water_req: str, 
                                      crop_type: str, language: str) -> Dict:
        """Generate irrigation recommendations"""
        if weather in ['Rain', 'Drizzle', 'Thunderstorm']:
            return self._create_recommendation('irrigation', 'success',
                f'Skip irrigation today due to rainfall. {crop_type} will get natural water.',
                'low', language)
        
        if water_req == 'very_high':
            if temp > 30 or humidity < 60:
                return self._create_recommendation('irrigation', 'alert',
                    f'Irrigate {crop_type} twice today (morning and evening). Very high water requirement.',
                    'high', language)
            return self._create_recommendation('irrigation', 'info',
                f'Irrigate {crop_type} once today. Maintain consistent moisture.',
                'medium', language)
        
        elif water_req == 'high':
            if temp > 32 or humidity < 50:
                return self._create_recommendation('irrigation', 'alert',
                    f'Irrigate {crop_type} today. Hot weather increases water needs.',
                    'high', language)
            return self._create_recommendation('irrigation', 'info',
                f'Regular irrigation recommended for {crop_type}.',
                'medium', language)
        
        elif water_req == 'medium':
            if temp > 30 and humidity < 55:
                return self._create_recommendation('irrigation', 'warning',
                    f'Irrigate {crop_type} today. Moderate water stress possible.',
                    'medium', language)
            return self._create_recommendation('irrigation', 'success',
                f'Irrigation every 2-3 days sufficient for {crop_type}.',
                'low', language)
        
        else:  # low water requirement
            return self._create_recommendation('irrigation', 'success',
                f'{crop_type} needs minimal irrigation. Water only when soil is dry.',
                'low', language)
    
    def _create_recommendation(self, category: str, priority: str, 
                              message: str, severity: str, language: str) -> Dict:
        """Create a recommendation object"""
        return {
            'id': f"{category}_{datetime.now(timezone.utc).timestamp()}",
            'category': category,
            'priority': priority,
            'message': message,
            'severity': severity,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'language': language
        }
    
    def get_alerts(self, forecast_data: List[Dict], crop_type: str, language: str = 'en') -> List[Dict]:
        """Generate weather alerts based on forecast"""
        alerts = []
        
        if not forecast_data or crop_type not in self.crop_rules:
            return alerts
        
        crop = self.crop_rules[crop_type]
        
        for day_forecast in forecast_data[:3]:  # Next 3 days
            temp = day_forecast.get('temperature', 25)
            rain_prob = day_forecast.get('rain_probability', 0)
            date = day_forecast.get('date', 'upcoming')
            
            # Extreme temperature alerts
            if temp > crop['optimal_temp'][1] + 5:
                alerts.append({
                    'type': 'extreme_heat',
                    'severity': 'high',
                    'message': f'Extreme heat expected on {date}. Take protective measures for {crop_type}.',
                    'date': date,
                    'language': language
                })
            
            if temp < crop['optimal_temp'][0] - 5:
                alerts.append({
                    'type': 'extreme_cold',
                    'severity': 'high',
                    'message': f'Cold weather expected on {date}. Protect {crop_type} from frost damage.',
                    'date': date,
                    'language': language
                })
            
            # Heavy rain alerts
            if rain_prob > 70 and crop['rain_tolerance'] == 'low':
                alerts.append({
                    'type': 'heavy_rain',
                    'severity': 'high',
                    'message': f'Heavy rain likely on {date}. Ensure drainage for {crop_type}.',
                    'date': date,
                    'language': language
                })
        
        return alerts

    def detect_severe_weather(self, forecast_data: List[Dict]) -> List[Dict]:
        """Detect severe weather events that require automated farmer alerts.
        Returns list of severe weather events with alert messages."""
        severe_events = []

        if not forecast_data:
            return severe_events

        SEVERE_KEYWORDS = ['thunderstorm', 'cyclone', 'tornado', 'hurricane',
                           'storm', 'hail', 'blizzard', 'flood']

        for day in forecast_data[:3]:
            temp = day.get('temperature', 25)
            rain_prob = day.get('rain_probability', 0)
            wind_speed = day.get('wind_speed', 0)
            description = (day.get('description', '') or '').lower()
            weather_main = (day.get('weather', '') or '').lower()
            date = day.get('date', 'upcoming')

            # Extreme heat (>45°C)
            if temp > 45:
                severe_events.append({
                    'type': 'extreme_heat',
                    'severity': 'critical',
                    'message': f'EXTREME HEAT WARNING for {date}: {temp}°C expected. Stay hydrated, protect crops with shade nets, irrigate early morning/evening.',
                    'date': date
                })

            # Frost/extreme cold (<5°C)
            if temp < 5:
                severe_events.append({
                    'type': 'frost',
                    'severity': 'critical',
                    'message': f'FROST ALERT for {date}: {temp}°C expected. Cover sensitive crops, apply mulch, avoid irrigation at night.',
                    'date': date
                })

            # Heavy rain (>80% probability)
            if rain_prob > 80:
                severe_events.append({
                    'type': 'heavy_rain',
                    'severity': 'high',
                    'message': f'HEAVY RAIN ALERT for {date}: {rain_prob}% rain probability. Ensure drainage, harvest ripe crops, postpone spraying.',
                    'date': date
                })

            # Severe storms (wind > 20 m/s)
            if wind_speed > 20:
                severe_events.append({
                    'type': 'severe_wind',
                    'severity': 'critical',
                    'message': f'SEVERE WIND WARNING for {date}: {wind_speed} m/s winds expected. Secure structures, stake tall crops, seek shelter.',
                    'date': date
                })

            # Storm/cyclone keywords
            for keyword in SEVERE_KEYWORDS:
                if keyword in description or keyword in weather_main:
                    severe_events.append({
                        'type': 'storm_warning',
                        'severity': 'critical',
                        'message': f'STORM WARNING for {date}: {description}. Take immediate protective measures. Stay safe.',
                        'date': date
                    })
                    break  # One alert per day per keyword match

        return severe_events
