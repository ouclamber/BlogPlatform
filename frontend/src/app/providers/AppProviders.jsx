import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

export default function AppProviders({ children }) {
  return (
    <BrowserRouter>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { background: '#363636', color: '#fff' },
        }}
      />
    </BrowserRouter>
  );
}