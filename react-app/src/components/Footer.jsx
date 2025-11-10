import logoWebp from '../assets/logo.webp';

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-logo">
            <picture>
              <source srcSet={logoWebp} type="image/webp" />
              <img src={logoWebp} alt="שרים עם אלון כהן" width="68" height="60" loading="lazy" />
            </picture>
            <p>קלידן, גיטריסט וזמר - שירי ארץ ישראל הישנה והטובה עם מערכת בחירה אינטראקטיבית</p>
          </div>
          <div className="footer-links">
            <h4>קישורים מהירים</h4>
            <ul>
              <li><a href="#home">בית</a></li>
              <li><a href="#about">אודות</a></li>
              <li><a href="#videos">וידאו</a></li>
              <li><a href="#services">שירותים</a></li>
              <li><a href="#contact">צור קשר</a></li>
            </ul>
          </div>
          <div className="footer-contact">
            <h4>צור קשר</h4>
            <p dir="ltr">052-896-2110</p>
            <p dir="ltr">contact@singwithalon.com</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 שרים עם אלון כהן. כל הזכויות שמורות.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
