(function () {
  if (window.__joyHotelWhatsAppFloatLoaded) {
    return;
  }
  window.__joyHotelWhatsAppFloatLoaded = true;

  const phoneNumber = '256788882185';
  const message = encodeURIComponent('Hello Joy Hotel, I would like to make an inquiry.');
  const waUrl = `https://wa.me/${phoneNumber}?text=${message}`;

  const style = document.createElement('style');
  style.textContent = `
    .joy-whatsapp-float {
      position: fixed;
      right: 20px;
      bottom: 20px;
      z-index: 9999;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #25d366;
      color: #fff;
      box-shadow: 0 12px 28px rgba(37, 211, 102, 0.35);
      text-decoration: none;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .joy-whatsapp-float:hover {
      transform: translateY(-3px) scale(1.04);
      box-shadow: 0 16px 34px rgba(37, 211, 102, 0.4);
    }
    .joy-whatsapp-float i {
      font-size: 28px;
      line-height: 1;
    }
    @media (max-width: 600px) {
      .joy-whatsapp-float {
        width: 56px;
        height: 56px;
        right: 14px;
        bottom: 14px;
      }
      .joy-whatsapp-float i {
        font-size: 24px;
      }
    }
  `;
  document.head.appendChild(style);

  const link = document.createElement('a');
  link.href = waUrl;
  link.className = 'joy-whatsapp-float';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', 'Chat with Joy Hotel on WhatsApp');
  link.innerHTML = '<i class="fa-brands fa-whatsapp" aria-hidden="true"></i>';

  document.body.appendChild(link);
})();
