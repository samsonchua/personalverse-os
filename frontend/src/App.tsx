import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { I18nProvider } from './i18n/I18nContext';
import { Shell } from './components/layout/Shell';
import { LoginView } from './components/auth/LoginView';

const AuthGate: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] text-slate-400 text-sm">
        Loading PersonalVerse...
      </div>
    );
  }

  return user ? <Shell /> : <LoginView />;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
};

export default App;
