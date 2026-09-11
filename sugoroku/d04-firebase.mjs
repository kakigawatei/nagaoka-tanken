import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {getAuth, signInAnonymously} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {getFirestore, connectFirestoreEmulator, doc, onSnapshot, getDocFromServer} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {getFunctions, connectFunctionsEmulator, httpsCallable} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js';
import {MATCH_COLLECTION, REGION} from './d04-core.mjs';

export async function connectFirebase(config, emulator) {
  const app = initializeApp(config, emulator ? 'sugoroku-d04-emulator' : 'sugoroku-d04');
  const db = getFirestore(app);
  const fn = getFunctions(app, REGION);
  if (emulator) {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectFunctionsEmulator(fn, '127.0.0.1', 5001);
  }
  const auth = getAuth(app);
  await auth.authStateReady();
  const user = auth.currentUser || (await signInAnonymously(auth)).user;
  return {uid: user.uid, transport: {
    call: async (name, body) => (await httpsCallable(fn, name)(body)).data,
    watchGame: (matchId, next, error) => onSnapshot(doc(db, MATCH_COLLECTION, matchId), {includeMetadataChanges: true}, snap => next(snap.exists() ? snap.data() : null, snap.metadata), error),
    watchHand: (matchId, seatId, next, error) => onSnapshot(doc(db, MATCH_COLLECTION, matchId, 'hands', seatId), snap => next(snap.exists() ? snap.data() : null), error),
    readGame: async matchId => {const snap = await getDocFromServer(doc(db, MATCH_COLLECTION, matchId)); return snap.exists() ? snap.data() : null;},
  }};
}
