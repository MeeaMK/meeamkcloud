
import {
  doc,
  getDoc,
  runTransaction,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../authService";
import { type Session } from "./Session";
import { type Player } from "./Player";

// Kaikki pelaajat käyttävät samaa pelisessiota
const SHARED_SESSION_ID = "shared-game";

// Luo yhteisen pelisession, jos sitä ei vielä ole.
// Jos sessio on jo olemassa, palautetaan se.
export async function createSession(
  createdBy: string = ""
): Promise<Session> {
  const sessionRef = doc(
    db,
    "sessions",
    SHARED_SESSION_ID
  );

  return await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(sessionRef);

    // Käytetään olemassa olevaa yhteistä peliä
    if (snapshot.exists()) {
      return {
        ...snapshot.data(),
        id: snapshot.id,
      } as Session;
    }

    // Luodaan yhteinen peli vain ensimmäisellä kerralla
    const newSession: Omit<Session, "id"> = {
      sessionName: "Hintavisa",
      players: [],
      currentRound: 0,
      maxRounds: 3,
      status: "waiting",
      currentProduct: null,
      correctPrice: null,
      winnerCodename: null,
      createdBy,
    };

    transaction.set(sessionRef, newSession);

    return {
      ...newSession,
      id: sessionRef.id,
    };
  });
}

// Liittää pelaajan yhteiseen pelisessioon
export async function joinSession(
  player: Player,
  sessionId: string
): Promise<void> {
  const sessionRef = doc(db, "sessions", sessionId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(sessionRef);

    if (!snapshot.exists()) {
      throw new Error("Pelisessiota ei löydy");
    }

    const session = snapshot.data() as Session;

    if (session.status !== "waiting") {
      throw new Error("Peli on jo alkanut");
    }

    // Estetään saman pelaajan liittyminen kahdesti
    if (session.players.some((p) => p.uid === player.uid)) {
      return;
    }

    // Enintään neljä pelaajaa
    if (session.players.length >= 4) {
      throw new Error("Peli on täynnä");
    }

    transaction.update(sessionRef, {
      players: [...session.players, player],
    });
  });
}

// Hakee pelisession
export async function getSession(
  sessionId: string
): Promise<Session | null> {
  const sessionRef = doc(db, "sessions", sessionId);
  const snapshot = await getDoc(sessionRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    ...snapshot.data(),
    id: snapshot.id,
  } as Session;
}

// Kuuntelee pelisession muutoksia reaaliajassa
export function subscribeToSession(
  sessionId: string,
  callback: (session: Session | null) => void
) {
  const sessionRef = doc(db, "sessions", sessionId);

  return onSnapshot(sessionRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    callback({
      ...snapshot.data(),
      id: snapshot.id,
    } as Session);
  });
}

// Tyhjentää pelaajat, kun peli on odotustilassa.
// Tämän jälkeen uudet käyttäjät voivat liittyä peliin.
export async function clearPlayers(
  sessionId: string
): Promise<void> {
  const sessionRef = doc(db, "sessions", sessionId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(sessionRef);

    if (!snapshot.exists()) {
      throw new Error("Pelisessiota ei löydy");
    }

    const session = snapshot.data() as Session;

    if (session.status !== "waiting") {
      throw new Error(
        "Pelaajia voi tyhjentää vain odotustilassa"
      );
    }

    transaction.update(sessionRef, {
      players: [],
    });
  });
}
