import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser, useLanguage } from "../App";

const SUPPORTED_CROPS = [
  "Rice", "Wheat", "Cotton", "Maize", "Sugarcane",
  "Tomato", "Potato", "Onion", "Chili", "Groundnut"
];

const RegistrationForm = () => {
  const navigate = useNavigate();
  const { registerUser } = useUser();
  const { language, t } = useLanguage();

  const [formData, setFormData] = useState({
    name: "",
    location: "",
    crop_type: "",
    phone_number: "",
    sms_enabled: true,
    voice_enabled: true,
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // handle input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!formData.crop_type) {
      setError("Please select a crop type.");
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        location: formData.location.trim(),
        crop_type: formData.crop_type,
        phone_number: formData.phone_number
          ? formData.phone_number.startsWith("+")
            ? formData.phone_number
            : `+91${formData.phone_number}`
          : "",
        sms_enabled: formData.sms_enabled,
        voice_enabled: formData.voice_enabled,
        language: language,
      };

      const result = await registerUser(payload);

      if (result.success) {
        setSuccess("Registration successful!");
        navigate("/dashboard");
      } else {
        setError(result.error || "Registration failed");
      }
    } catch (err) {
      console.error(err);
      setError("Registration failed");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen py-12">
      <div className="card" style={{ maxWidth: '450px', width: '100%' }}>
        <h2 className="text-2xl font-bold text-center mb-6">
          {t('register.title')}
        </h2>

        {error && (
          <div className="alert alert-danger mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div className="form-group">
            <label className="form-label">{t('register.name')}</label>
            <input
              type="text"
              name="name"
              placeholder={t('register.namePlaceholder')}
              value={formData.name}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          {/* Location */}
          <div className="form-group">
            <label className="form-label">{t('register.location')}</label>
            <input
              type="text"
              name="location"
              placeholder={t('register.locationPlaceholder')}
              value={formData.location}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          {/* Crop — Dropdown instead of free text */}
          <div className="form-group">
            <label className="form-label">{t('register.crop')}</label>
            <select
              name="crop_type"
              value={formData.crop_type}
              onChange={handleChange}
              className="form-select"
              required
            >
              <option value="" disabled>
                {t('register.cropPlaceholder')}
              </option>
              {SUPPORTED_CROPS.map((crop) => (
                <option key={crop} value={crop}>
                  {crop}
                </option>
              ))}
            </select>
          </div>

          {/* Phone */}
          <div className="form-group">
            <label className="form-label">{t('register.phone') || 'Phone Number'}</label>
            <input
              type="text"
              name="phone_number"
              placeholder={t('register.phone') || 'Phone Number'}
              value={formData.phone_number}
              onChange={handleChange}
              className="form-input"
            />
          </div>

          {/* SMS */}
          <div className="form-group mb-2">
            <label className="flex items-center" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="sms_enabled"
                checked={formData.sms_enabled}
                onChange={handleChange}
                style={{ width: '20px', height: '20px', marginRight: '0.5rem' }}
              />
              <span className="font-semibold">{t('register.smsAlerts') || 'SMS Alerts'}</span>
            </label>
          </div>

          {/* Voice */}
          <div className="form-group mb-6">
            <label className="flex items-center" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="voice_enabled"
                checked={formData.voice_enabled}
                onChange={handleChange}
                style={{ width: '20px', height: '20px', marginRight: '0.5rem' }}
              />
              <span className="font-semibold">{t('register.voiceAlerts') || 'Voice Alerts'}</span>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary w-full"
          >
            {t('register.submit')}
          </button>
          
          {/* Back to Home */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-primary font-semibold"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ← {t('common.back')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegistrationForm;