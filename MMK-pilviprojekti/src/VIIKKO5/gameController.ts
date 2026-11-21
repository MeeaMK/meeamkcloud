import {
  doc,
  runTransaction,
} from "firebase/firestore";

import { db } from "../authService";
import { type Session } from "./Session";
import { fetchRandomProduct } from "./productService";

// Aloittaa pelin, jos pelaajia on vähintään kaksi
export async function startGameIfPossible(
  sessionId: string
): Promise<void> {
  const product = await fetchRandomProduct();
  const sessionRef = doc(db, "sessions", sessionId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(sessionRef);

    if (!snapshot.exists()) {
      throw new Error("Pelisessiota ei löydy");
    }

    const session = snapshot.data() as Session;

    if (session.status !== "waiting") {
      throw new Error("Peli ei ole odotustilassa");
    }

    if (session.players.length < 2) {
      throw new Error("Tarvitaan vähintään kaksi pelaajaa");
    }

    transaction.update(sessionRef, {
      status: "playing",
      currentRound: 1,
      currentProduct: product,
      correctPrice: null,
      players: session.players.map((player) => ({
        ...player,
        guess: null,
      })),
    });
  });
}

// Tallentaa pelaajan arvauksen
export async function submitGuess(
  sessionId: string,
  uid: string,
  guess: number
): Promise<void> {
  if (!Number.isFinite(guess) || guess < 0) {
    throw new Error("Virheellinen arvaus");
  }

  const sessionRef = doc(db, "sessions", sessionId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(sessionRef);

    if (!snapshot.exists()) {
      throw new Error("Pelisessiota ei löydy");
    }

    const session = snapshot.data() as Session;

    if (
      session.status !== "playing" ||
      session.correctPrice !== null
    ) {
      throw new Error("Arvauksia ei voi enää lähettää");
    }

    if (!session.currentProduct) {
      throw new Error("Pelissä ei ole aktiivista tuotetta");
    }

    const playerIndex = session.players.findIndex(
      (player) => player.uid === uid
    );

    if (playerIndex === -1) {
      throw new Error("Pelaajaa ei löydy");
    }

    if (session.players[playerIndex].guess !== null) {
      throw new Error("Olet jo arvannut");
    }

    const players = session.players.map((player) =>
      player.uid === uid
        ? { ...player, guess }
        : player
    );

    const allGuessed = players.every(
      (player) => player.guess !== null
    );

    if (allGuessed) {
      const correctPrice = session.currentProduct.price;

      // Selvitetään pienin ero oikeaan hintaan
      const smallestDifference = Math.min(
        ...players.map((player) =>
          Math.abs(player.guess! - correctPrice)
        )
      );

      // Lähimmät arvaajat saavat yhden pisteen
      const updatedPlayers = players.map((player) => {
        const difference = Math.abs(
          player.guess! - correctPrice
        );

        return {
          ...player,
          score:
            player.score +
            (difference === smallestDifference ? 1 : 0),
        };
      });

      transaction.update(sessionRef, {
        players: updatedPlayers,
        correctPrice,
      });
    } else {
      transaction.update(sessionRef, {
        players,
      });
    }
  });
}

// Siirtyy seuraavaan kierrokseen tai päättää pelin
export async function nextRound(
  sessionId: string
): Promise<void> {
  const sessionRef = doc(db, "sessions", sessionId);

  const snapshot = await runTransaction(
    db,
    async (transaction) => {
      const docSnapshot = await transaction.get(sessionRef);

      if (!docSnapshot.exists()) {
        throw new Error("Pelisessiota ei löydy");
      }

      const session = docSnapshot.data() as Session;

      if (
        session.status !== "playing" ||
        session.correctPrice === null
      ) {
        throw new Error("Kierros ei ole vielä valmis");
      }

      return session;
    }
  );

  if (snapshot.currentRound >= snapshot.maxRounds) {
    await runTransaction(db, async (transaction) => {
      const docSnapshot = await transaction.get(sessionRef);

      if (!docSnapshot.exists()) {
        throw new Error("Pelisessiota ei löydy");
      }

      const session = docSnapshot.data() as Session;

      if (
        session.status !== "playing" ||
        session.correctPrice === null
      ) {
        return;
      }

      const winner = [...session.players].sort(
        (a, b) => b.score - a.score
      )[0];

      transaction.update(sessionRef, {
        status: "finished",
        winnerCodename: winner?.codename ?? null,
      });
    });

    return;
  }

  const product = await fetchRandomProduct();

  await runTransaction(db, async (transaction) => {
    const docSnapshot = await transaction.get(sessionRef);

    if (!docSnapshot.exists()) {
      throw new Error("Pelisessiota ei löydy");
    }

    const session = docSnapshot.data() as Session;

    if (
      session.status !== "playing" ||
      session.correctPrice === null ||
      session.currentRound !== snapshot.currentRound
    ) {
      return;
    }

    transaction.update(sessionRef, {
      currentRound: session.currentRound + 1,
      currentProduct: product,
      correctPrice: null,
      players: session.players.map((player) => ({
        ...player,
        guess: null,
      })),
    });
  });
}

// Tyhjentää pelaajat odotustilassa
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

// Palauttaa pelin odotustilaan

export async function resetGame(
  sessionId: string
): Promise<void> {
  const sessionRef = doc(db, "sessions", sessionId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(sessionRef);

    if (!snapshot.exists()) {
      throw new Error("Pelisessiota ei löydy");
    }

    const session = snapshot.data() as Session;

    transaction.update(sessionRef, {
      status: "waiting",
      currentRound: 0,
      currentProduct: null,
      correctPrice: null,
      winnerCodename: null,
      players: session.players.map((player) => ({
        ...player,
        score: 0,
        guess: null,
      })),
    });
  });
}

