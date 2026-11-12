// Funcionamiento sin conexión: caché local, cola de operaciones y sincronización.
export type { PendingOperation } from './offlineStore';
export { offlineSupported, configureOffline, stopOffline, backgroundAuth } from './offlineSession';
export { offlineStatus, exportOfflineBackup, syncOffline, retryOffline } from './offlineSync';
export { withOffline } from './withOffline';
