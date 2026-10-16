// Import through Vite's module graph so each stylesheet has its own resolved path.
// Keep this order: shared controls, screens, tools, mobile presentation, then print.
import './foundation.css';
import './workspace.css';
import './tools.css';
import './responsive.css';
import './mobile-native.css';
import './print.css';
