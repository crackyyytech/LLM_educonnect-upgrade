import { useAuth } from './context/useAuth.js';
import LoginPage from './components/LoginPage.jsx';
import App from './App.jsx';

export default function Root() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="root-loading">
        <div className="root-loading-icon">📚</div>
        <div className="root-loading-spinner" />
        <div className="root-loading-text">கல்வி ஏற்றுகிறது...</div>
      </div>
    );
  }

  if (!user) return <LoginPage />;
  return <App />;
}
