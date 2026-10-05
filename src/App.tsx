import React, { useEffect } from 'react';
import LandingPage from './LandingPage';
import BookingPortal from './BookingPortal';
import AdminPanel from './AdminPanel';
import { updateFavicon } from './utils/favicon';

export default function App() {
  const path = window.location.pathname;

  useEffect(() => {
    fetch('/api/public/clinic')
      .then(res => res.json())
      .then(data => {
        if (data.clinic) {
          if (data.clinic.logoUrl) {
            updateFavicon(data.clinic.logoUrl);
          }
          if (data.clinic.clinicName) {
            document.title = data.clinic.clinicName;
          }
        }
      })
      .catch(() => {});
  }, []);

  if (path === '/reservar') {
    return <BookingPortal />;
  }

  if (path === '/panel' || path === '/admin') {
    return <AdminPanel />;
  }

  return <LandingPage />;
}
