import { ToastProvider } from "./context/ToastContext";
import { AuthGate } from "./features/retail/AuthGate";
import { RetailApp } from "./features/retail/RetailApp";
import { PwaStatus } from "./components/PwaStatus";
import { useMobileViewport } from './features/retail/useMobileExperience';
import "./styles/app";
export function App() {
  useMobileViewport();
  return (
    <ToastProvider>
      <PwaStatus />
      <AuthGate>
        {(session) => <RetailApp key={session.user.id} session={session} />}
      </AuthGate>
    </ToastProvider>
  );
}
export default App;
