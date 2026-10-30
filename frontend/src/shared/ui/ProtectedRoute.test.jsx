import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import useAuthStore from '@/entities/user/model/authStore';

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('перенаправляет на /login, если не авторизован', () => {
    useAuthStore.setState({ isAuthenticated: false });
    
    render(
      <MemoryRouter initialEntries={['/secret']}>
        <Routes>
          <Route 
            path="/secret" 
            element={
              <ProtectedRoute>
                <div>Секретная страница</div>
              </ProtectedRoute>
            } 
          />
          <Route path="/login" element={<div>Страница входа</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Страница входа')).toBeInTheDocument();
    expect(screen.queryByText('Секретная страница')).not.toBeInTheDocument();
  });

  it('рендерит контент, если авторизован', () => {
    useAuthStore.setState({ isAuthenticated: true });
    
    render(
      <MemoryRouter initialEntries={['/secret']}>
        <Routes>
          <Route 
            path="/secret" 
            element={
              <ProtectedRoute>
                <div>Секретная страница</div>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Секретная страница')).toBeInTheDocument();
  });
});