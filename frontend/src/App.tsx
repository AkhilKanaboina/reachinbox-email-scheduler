import { AuthProvider, useSession } from './hooks/useSession';
import HomePage from './app/page';
import DashboardPage from './app/dashboard/page';
import { Spinner } from './components/ui/Spinner';
import { Toaster } from 'sonner';

function RootApp() {
  const { status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-base">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <>
      {status === 'authenticated' ? <DashboardPage /> : <HomePage />}
      <Toaster position="top-right" theme="dark" closeButton />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RootApp />
    </AuthProvider>
  );
}
