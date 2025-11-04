import { useState } from 'react';

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
    <section id="contact" className="contact">
      <div className="contact-overlay"></div>
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">בואו נתחיל לתכנן את האירוע שלכם</h2>
          <p className="section-subtitle">צרו איתי קשר ונבנה יחד את החוויה המוזיקלית המושלמת עבורכם</p>
        </div>

        <div className="contact-content">
          <div className="contact-info">
            <div className="contact-item">
              <div className="contact-icon">
                <i className="fas fa-phone"></i>
              </div>
              <div className="contact-details">
                <h3>טלפון</h3>
                <p><a href="tel:+972528962110" dir="ltr">052-896-2110</a></p>
              </div>
            </div>

            <div className="contact-item">
              <div className="contact-icon">
                <i className="fas fa-envelope"></i>
              </div>
              <div className="contact-details">
                <h3>אימייל</h3>
                <p><a href="mailto:contact@singwithalon.com" dir="ltr">contact@singwithalon.com</a></p>
              </div>
            </div>

            <div className="contact-item">
              <div className="contact-icon">
                <i className="fab fa-whatsapp"></i>
              </div>
              <div className="contact-details">
                <h3>WhatsApp</h3>
                <p><a href="https://wa.me/972528962110" dir="ltr">052-896-2110</a></p>
              </div>
            </div>
          </div>

          <div className="contact-form">
            <form id="contact-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">שם מלא</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="phone">טלפון</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="date">תאריך מועדף</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="message">פרטים נוספים על האירוע</label>
                <textarea
                  id="message"
                  name="message"
                  rows="4"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="ספרו לי קצת על האירוע - מספר אורחים, מיקום, סוג האירוע, שירים מיוחדים שתרצו לשמוע..."
                ></textarea>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
                aria-label="שלח הודעה"
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
              </button>

              {/* Status Message */}
              {messageStatus && (
                <div
                  className={`form-message ${messageStatus.type}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '15px 20px',
                    marginTop: '20px',
                    borderRadius: '10px',
                    fontWeight: '500',
                    background: messageStatus.type === 'success' ? '#d4edda' : '#f8d7da',
                    color: messageStatus.type === 'success' ? '#155724' : '#721c24',
                    border: `1px solid ${messageStatus.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
                    whiteSpace: 'pre-line'
                  }}
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
