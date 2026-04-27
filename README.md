# 🌾 Farm-Nimbus AI

Farm-Nimbus AI is a comprehensive, multilingual agricultural dashboard designed to empower farmers with actionable insights. By combining real-time weather data with artificial intelligence, the platform delivers personalized crop recommendations and critical weather alerts directly to users in both English and Telugu.

## ✨ Key Features

* **🌍 Multilingual Interface:** Full support for English and Telugu to ensure accessibility for a wider agricultural community.
* **🌦️ Real-Time Weather Alerts:** Timely notifications and forecasts to help farmers prepare for changing weather conditions and protect their yields.
* **🧠 AI-Driven Recommendations:** Smart, context-aware suggestions for crop management, planting schedules, and resource optimization based on current environmental data.
* **📊 Interactive Dashboard:** A clean, intuitive user interface for monitoring farm metrics and weather patterns at a glance.

## 🛠️ Technology Stack

* **Frontend:** React.js
* **Backend:** Node.js, Express.js
* **Database:** MongoDB
* **Integrations:** Weather API (for real-time forecasting), AI/ML processing modules
* **Styling:** CSS / Material-UI (or preferred styling framework)

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/) installed on your machine.

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/abhishekveernapu/Farm-Nimbus.git](https://github.com/abhishekveernapu/Farm-Nimbus.git)
   cd Farm-Nimbus

   ```

2. **Install Frontend Dependencies:**
   ```bash
   cd frontend
   npm install
   ```

3. **Install Backend Dependencies:**
   ```bash
   cd ../backend
   npm install
   ```

4. **Environment Variables:**
   Create a `.env` file in the `backend` directory and add the necessary API keys and database URIs:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   WEATHER_API_KEY=your_weather_api_key
   # Add any other required AI or service keys here
   ```

5. **Run the Application:**
   Open two terminal windows:
   * **Terminal 1 (Backend):** `cd backend && npm run dev`
   * **Terminal 2 (Frontend):** `cd frontend && npm run dev`
