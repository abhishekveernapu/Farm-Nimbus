# 🌾 Farm-Nimbus AI

Farm-Nimbus AI is a comprehensive, multilingual agricultural dashboard designed to empower farmers with actionable insights. By combining real-time weather data with artificial intelligence, the platform delivers personalized crop recommendations and critical weather alerts directly to users across multiple languages.

## ✨ Key Features

* **🌍 Multilingual Interface:** Native translation support (powered by `deep-translator`) ensuring accessibility for a wider agricultural community, including English and Telugu.
* **🌦️ Real-Time Weather & Alerts:** Timely notifications and forecasts to help farmers prepare for changing weather conditions, with Twilio integration for SMS alerts.
* **🧠 AI-Driven Recommendations:** Smart, context-aware suggestions for crop management, planting schedules, and resource optimization.
* **📊 Interactive Dashboard:** A clean, intuitive user interface featuring interactive charts (Recharts) for monitoring farm metrics and weather patterns at a glance.

## 🛠️ Technology Stack

**Frontend:**
* **Framework:** React.js (v19) with Vite
* **Routing:** React Router DOM
* **Data Visualization:** Recharts
* **Icons & Styling:** Lucide-React
* **HTTP Client:** Axios

**Backend:**
* **Framework:** FastAPI (Python)
* **Server:** Uvicorn
* **Database Driver:** Motor (Async MongoDB) / PyMongo
* **Authentication:** Python-JOSE, Passlib, Bcrypt
* **Integrations:** Twilio (Notifications), Deep-Translator (Multilingual support)

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) and npm (for the frontend)
* [Python 3.8+](https://www.python.org/) (for the backend)
* MongoDB database (local or Atlas)

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/abhishekveernapu/Farm-Nimbus.git](https://github.com/abhishekveernapu/Farm-Nimbus.git)
   cd Farm-Nimbus
   ```

2. **Setup the Backend (FastAPI):**
   ```bash
   cd backend
   # Create a virtual environment
   python -m venv venv
   
   # Activate the virtual environment
   # On Windows: venv\Scripts\activate
   # On macOS/Linux: source venv/bin/activate
   
   # Install dependencies
   pip install -r requirements.txt
   ```

3. **Setup the Frontend (React/Vite):**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Environment Variables:**
   Create a `.env` file in the `backend` directory:
   ```env
   MONGO_URI=your_mongodb_connection_string
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   SECRET_KEY=your_jwt_secret_key
   # Add any other required AI or weather API keys here
   ```

5. **Run the Application:**
   Open two terminal windows:
   
   * **Terminal 1 (Backend):**
      ```bash
     cd backend
     source venv/bin/activate  # Or Windows equivalent
     uvicorn server:app --reload
     ```
     
   * **Terminal 2 (Frontend):**
     ```bash
     cd frontend
     npm run dev
     ```
     
