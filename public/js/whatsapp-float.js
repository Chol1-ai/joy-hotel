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
      width: 58px;
      height: 58px;
      border-radius: 50%;
      background: linear-gradient(135deg, #25d366, #128c7e);
      color: #fff;
      box-shadow: 0 10px 25px rgba(18, 140, 126, 0.35);
      text-decoration: none;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .joy-whatsapp-float:hover {
      transform: translateY(-3px) scale(1.03);
      box-shadow: 0 14px 30px rgba(18, 140, 126, 0.4);
    }
    .joy-whatsapp-float svg {
      width: 28px;
      height: 28px;
      fill: currentColor;
    }
    @media (max-width: 600px) {
      .joy-whatsapp-float {
        width: 54px;
        height: 54px;
        right: 14px;
        bottom: 14px;
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
  link.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.868-2.031-.967-.273-.099-.486-.149-.691.149-.204.297-.788.967-.967 1.165-.18.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.654-2.059-.174-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.149-.174.198-.297.297-.495.099-.198.05-.372-.025-.521-.074-.149-.668-1.611-.916-2.207-.241-.58-.487-.501-.668-.51-.174-.008-.372-.01-.571-.01-.198 0-.521.074-.795.372-.274.297-1.046 1.022-1.046 2.487 0 1.465 1.071 2.885 1.221 3.083.149.198 2.107 3.218 5.107 4.511.713.307 1.27.49 1.704.628.714.228 1.365.197 1.879.119.574-.086 1.758-.72 2.006-1.414.249-.694.249-1.286.174-1.414-.074-.128-.273-.198-.571-.347zM12.002 2.25C6.814 2.25 2.652 6.41 2.652 11.6c0 2.046.677 3.962 1.929 5.53L2.25 21.75l4.794-1.23a9.34 9.34 0 0 0 5.958 1.91c5.188 0 9.35-4.16 9.35-9.35 0-5.19-4.16-9.35-9.35-9.35z"/>
    </svg>`;

  document.body.appendChild(link);
})();
