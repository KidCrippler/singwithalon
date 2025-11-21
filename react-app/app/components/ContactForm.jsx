'use client'

import { useState } from 'react';
import { ButtonPrimary } from './ui/Button';
import { SectionHeader } from './ui/SectionHeader';

/**
 * ContactForm component with Tailwind styling
 * Replaces .contact, .contact-content, .contact-info, .contact-item, .contact-icon, .contact-details, .contact-form, .form-row, .form-group from legacy CSS
 * Musical icon decoration uses custom .contact-musical-icon class from globals.css
 */

// Form validation utility
class FormValidator {
  static validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  static validatePhone(phone) {
    // Israeli phone number validation
    const re = /^(\+972|0)([23489]|5[02468]|77)[0-9]{7}$/;
    return re.test(phone.replace(/[- ]/g, ''));
  }

  static validateForm(formData) {
    const errors = [];

    if (!formData.name || formData.name.length < 2) {
      errors.push('שם מלא חייב להכיל לפחות 2 תווים');
    }

    if (!FormValidator.validatePhone(formData.phone)) {
      errors.push('מספר טלפון לא תקין');
    }

    if (!formData.date) {
      errors.push('יש לבחור תאריך');
    } else {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to compare dates only
      if (selectedDate < today) {
        errors.push('התאריך חייב להיות היום או בעתיד');
      }
    }

    return errors;
  }
}

function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    date: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messageStatus, setMessageStatus] = useState(null); // { type: 'success' | 'error', text: string }

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Show message with auto-hide after 5 seconds
  const showMessage = (text, type) => {
    setMessageStatus({ type, text });
    setTimeout(() => {
      setMessageStatus(null);
    }, 5000);
  };

  // Send WhatsApp message
  const sendWhatsAppMessage = async (data) => {
    const formattedDate = data.date ? new Date(data.date).toLocaleDateString('he-IL') : 'לא צוין';

    const message = `שלום אלון! 🎵

אני מעוניין/ת להזמין מופע:

👤 שם: ${data.name}
📞 טלפון: ${data.phone}
📅 תאריך מועדף: ${formattedDate}

💬 פרטים נוספים:
${data.message || 'לא צוינו פרטים נוספים'}

אשמח לשמוע ממך בהקדם! 🎶`;

    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);
    const phoneNumber = '972528962110'; // WhatsApp number in international format
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Try multiple methods to open WhatsApp
    try {
      // Method 1: Try window.open with user gesture
      const newWindow = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

      // Method 2: If popup blocked, use direct navigation
      if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
        // Popup was blocked, use location.href as fallback
        window.location.href = whatsappUrl;
      } else {
        // Popup opened successfully
        showMessage('הודעת WhatsApp נוצרה בהצלחה! הדפדפן ייפתח בעוד רגע.', 'success');
        // Reset form
        setFormData({
          name: '',
          phone: '',
          date: '',
          message: ''
        });
      }
    } catch (error) {
      // Method 3: Direct navigation as last resort
      console.log('Popup failed, using direct navigation:', error);
      window.location.href = whatsappUrl;
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form first
    const errors = FormValidator.validateForm(formData);
    if (errors.length > 0) {
      showMessage(errors.join('\n'), 'error');
      return;
    }

    // Show loading state
    setIsSubmitting(true);

    try {
      // Create WhatsApp message
      await sendWhatsAppMessage(formData);
    } catch (error) {
      console.error('WhatsApp message error:', error);
      showMessage('שגיאה ביצירת הודעת WhatsApp. אנא נסו שוב.', 'error');
    } finally {
      // Reset button
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="contact"
      className="relative py-[100px] contact-musical-icon"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.96)'
      }}
    >
      <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
        <SectionHeader
          title="בואו נתחיל לתכנן את האירוע שלכם"
          subtitle="צרו איתי קשר ונבנה יחד את החוויה המוזיקלית המושלמת עבורכם"
        />

        {/* Contact Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[30px] md:gap-[60px]">

          {/* Contact Info */}
          <div className="flex flex-col gap-[30px]">
            {/* Phone */}
            <div className="flex items-center gap-5">
              <div className="w-[60px] h-[60px] bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center text-white text-2xl flex-shrink-0">
                <i className="fas fa-phone"></i>
              </div>
              <div>
                <h3 className="text-[#2c3e50] mb-[5px] font-semibold">טלפון</h3>
                <p className="m-0">
                  <a href="tel:+972528962110" dir="ltr" className="text-primary no-underline hover:underline">
                    052-896-2110
                  </a>
                </p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center gap-5">
              <div className="w-[60px] h-[60px] bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center text-white text-2xl flex-shrink-0">
                <i className="fas fa-envelope"></i>
              </div>
              <div>
                <h3 className="text-[#2c3e50] mb-[5px] font-semibold">אימייל</h3>
                <p className="m-0">
                  <a href="mailto:contact@singwithalon.com" dir="ltr" className="text-primary no-underline hover:underline">
                    contact@singwithalon.com
                  </a>
                </p>
              </div>
            </div>

            {/* WhatsApp */}
            <div className="flex items-center gap-5">
              <div className="w-[60px] h-[60px] bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center text-white text-2xl flex-shrink-0">
                <i className="fab fa-whatsapp"></i>
              </div>
              <div>
                <h3 className="text-[#2c3e50] mb-[5px] font-semibold">WhatsApp</h3>
                <p className="m-0">
                  <a href="https://wa.me/972528962110" dir="ltr" className="text-primary no-underline hover:underline">
                    052-896-2110
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-[#f8f9fa] p-10 rounded-[20px]">
            <form id="contact-form" onSubmit={handleSubmit}>
              {/* Form Row - Name and Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div className="flex flex-col gap-2">
                  <label htmlFor="name" className="text-[#2c3e50] font-semibold">
                    שם מלא
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="p-[15px] border-2 border-[#e0e6ed] rounded-[10px] text-base font-sans transition-colors duration-300 focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="phone" className="text-[#2c3e50] font-semibold">
                    טלפון
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="p-[15px] border-2 border-[#e0e6ed] rounded-[10px] text-base font-sans transition-colors duration-300 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Date Field */}
              <div className="flex flex-col gap-2 mb-5">
                <label htmlFor="date" className="text-[#2c3e50] font-semibold">
                  תאריך מועדף
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="p-[15px] border-2 border-[#e0e6ed] rounded-[10px] text-base font-sans transition-colors duration-300 focus:outline-none focus:border-primary"
                />
              </div>

              {/* Message Field */}
              <div className="flex flex-col gap-2 mb-5">
                <label htmlFor="message" className="text-[#2c3e50] font-semibold">
                  פרטים נוספים על האירוע
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows="4"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="ספרו לי קצת על האירוע - מספר אורחים, מיקום, סוג האירוע, שירים מיוחדים שתרצו לשמוע..."
                  className="p-[15px] border-2 border-[#e0e6ed] rounded-[10px] text-base font-sans transition-colors duration-300 focus:outline-none focus:border-primary resize-y min-h-[120px]"
                ></textarea>
              </div>

              {/* Submit Button */}
              <ButtonPrimary
                type="submit"
                disabled={isSubmitting}
                aria-label="שלח הודעה"
                className="mt-[25px]"
              >
                {isSubmitting ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    יוצר הודעה...
                  </>
                ) : (
                  <>
                    <i className="fab fa-whatsapp"></i>
                    שלח הודעת WhatsApp
                  </>
                )}
              </ButtonPrimary>

              {/* Status Message */}
              {messageStatus && (
                <div
                  className={`flex items-center gap-[10px] p-[15px_20px] mt-5 rounded-[10px] font-medium whitespace-pre-line ${
                    messageStatus.type === 'success'
                      ? 'bg-[#d4edda] text-[#155724] border border-[#c3e6cb]'
                      : 'bg-[#f8d7da] text-[#721c24] border border-[#f5c6cb]'
                  }`}
                >
                  <i className={`fas fa-${messageStatus.type === 'success' ? 'check-circle' : 'exclamation-circle'}`}></i>
                  <span>{messageStatus.text}</span>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ContactForm;
