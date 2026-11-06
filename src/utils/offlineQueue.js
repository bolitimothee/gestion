import { supabase } from '../services/supabaseClient';

const DATABASE_NAME = 'viewy-offline';
const STORE_NAME = 'pending-operations';
const DATABASE_VERSION = 1;

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponible'));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueOperation(operation) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).add({ ...operation, created_at: new Date().toISOString() });
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

export async function getPendingOperations() {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
    request.onsuccess = () => {
      database.close();
      resolve(request.result || []);
    };
    request.onerror = () => {
      database.close();
      reject(request.error);
    };
  });
}

export async function removeOperation(id) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

export async function updateOperation(id, updates) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      if (!request.result) {
        transaction.abort();
        reject(new Error(`Opération hors ligne introuvable : ${id}`));
        return;
      }
      store.put({ ...request.result, ...updates, id });
    };
    request.onerror = () => {
      database.close();
      reject(request.error);
    };
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error || new Error('Mise à jour de l’opération hors ligne annulée.'));
    };
  });
}

export function registerOfflineSync(syncOperation) {
  if (typeof window === 'undefined') return () => {};

  let syncing = false;
  const sync = async () => {
    if (syncing || !navigator.onLine) return;
    syncing = true;
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user?.id) return;
      const operations = await getPendingOperations();
      for (const operation of operations.filter((item) => item.userId === session.user.id)) {
        try {
          await syncOperation(operation);
          await removeOperation(operation.id);
        } catch {
          break;
        }
      }
    } finally {
      syncing = false;
    }
  };

  const onAuthStateChange = (_event, session) => {
    if (session?.user?.id) setTimeout(sync, 0);
  };
  const { data: { subscription } } = supabase.auth.onAuthStateChange(onAuthStateChange);
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') sync();
  };

  window.addEventListener('online', sync);
  window.addEventListener('focus', sync);
  document.addEventListener('visibilitychange', onVisibilityChange);
  sync();
  return () => {
    window.removeEventListener('online', sync);
    window.removeEventListener('focus', sync);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    subscription.unsubscribe();
  };
}
