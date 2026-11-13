// JOLOF TRADING public contact details used across the storefront.
export const WHATSAPP_NUMBER = '13478403858'; // digits only, for wa.me links
export const WHATSAPP_DISPLAY = '+1 (347) 840-3858';
export const whatsappLink = (text = 'Hi JOLOF TRADING, I would like to know more about your products.') =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
