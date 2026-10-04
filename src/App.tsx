import React from 'react';
import LandingPage from './LandingPage';
import BookingPortal from './BookingPortal';
import AdminPanel from './AdminPanel';

export default function App() {
  const path = window.location.pathname;

  if (path === '/reservar') {
    return <BookingPortal />;
  }

  if (path === '/panel' || path === '/admin') {
    return <AdminPanel />;
  }

  return <LandingPage />;
}
