import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

export default function AppProviders({ children }) {
  return (
    <BrowserRouter>
      {children}
      <Toaster
        position="top-right"
        gutter={10}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
            borderRadius: '14px',
            padding: '10px 14px',
            boxShadow: '0 10px 30px -10px rgba(17, 24, 39, 0.45)',
          },
          success: { iconTheme: { primary: '#a855f7', secondary: '#fff' } },
        }}
      />
    </BrowserRouter>
  );
}
