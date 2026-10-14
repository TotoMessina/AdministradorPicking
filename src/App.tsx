import { ToastProvider } from "./context/ToastContext";
import { AuthGate } from "./features/retail/AuthGate";
import { RetailApp } from "./features/retail/RetailApp";
import "./features/retail/retail.css";
import { PwaStatus } from "./components/PwaStatus";
import "./responsive.css";
import "./mobile-app.css";
import "./features/retail/experience.css";
import "./features/retail/palette.css";
export function App() {
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
