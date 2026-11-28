import { useEffect, useState, useRef, useCallback } from "react";
import {
  onAuthStateChanged,
  type User,
} from "firebase/auth";

import heroImg from "./assets/hero.png";
import reactLogo from "./assets/react.svg";
import viteLogo from "./assets/vite.svg";

import LoginForm from "./LoginForm";
import { auth, logout } from "./authService";

import {
  createSession,
  joinSession,
  subscribeToSession,
  clearPlayers,
} from "./VIIKKO5/gameSessionService";

import {
  startGameIfPossible,
  submitGuess,
  nextRound,
  resetGame,
} from "./VIIKKO5/gameController";

import { QuizForm } from "./VIIKKO5/QuizForm";

import { type Session } from "./VIIKKO5/Session";
import { type Player } from "./VIIKKO5/Player";

import "./App.css";
import ConsentBanner from "./ConsentBanner";

function useCloudflareAnalytics() {
  const trackEvent = useCallback(
    (eventName: string, data?: Record<string, any>) => {
      // if (!getConsent()) return; // Jos haluaa tarkistaa 6.1 kohdan consentin
      if (!window._cfq) {
        window._cfq = [];
      }

      window._cfq.push([
        "trackEvent",
        {
          name: eventName,
          ...data,
          timestamp: new Date().toISOString(),
        },
      ]);
    },
    []
  );

  return { trackEvent };
}

function RouteAnalytics() {
  const { trackEvent } = useCloudflareAnalytics();

  const initialReferrer = useRef<string>(
    document.referrer || "direct"
  );

  useEffect(() => {
    trackEvent("page_view", {
      referrer: initialReferrer.current,
      landingPath: window.location.pathname,
    });
  }, [trackEvent]);

  return null;
}

function generateCodename(): string {
  const adjectives = [
    "Pinkki",
    "Hassu",
    "Hiljainen",
    "Hullu",
    "Tyylikäs",
    "Hidas",
  ];

  const animals = [
    "Kettu",
    "Gerbiili",
    "Lisko",
    "Linnu",
    "Robotti",
  ];

  const number = Math.floor(Math.random() * 3000);

  const adjective =
    adjectives[Math.floor(Math.random() * adjectives.length)];

  const animal =
    animals[Math.floor(Math.random() * animals.length)];

  return `${adjective}${animal}${number}`;
}

function AppViikko6Content() {
  const [user, setUser] = useState<User | null>(null);
  const [codename, setCodename] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameLoading, setGameLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Firebase-kirjautumisen kuuntelu
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Haetaan tai luodaan koodinimi
  useEffect(() => {
    if (!user) {
      setCodename("");
      return;
    }

    const storageKey = `codename_${user.uid}`;
    let savedCodename = localStorage.getItem(storageKey);

    if (!savedCodename) {
      savedCodename = generateCodename();
      localStorage.setItem(storageKey, savedCodename);
    }

    setCodename(savedCodename);
  }, [user]);

  // Haetaan yhteinen pelisessio ja liitetään pelaaja siihen
  useEffect(() => {
    if (!user || !codename) {
      setSession(null);
      return;
    }

    let unsubscribeSession: (() => void) | undefined;
    let cancelled = false;

    async function initializeGame() {
      try {
        setGameLoading(true);
        setError(null);

        const sharedSession = await createSession(user!.uid);

        if (cancelled) return;

        // Tarkistetaan, onko käyttäjä jo pelaajalistassa
        const existingPlayer = sharedSession.players.find(
          (player) => player.uid === user!.uid
        );

        // Jos pelaaja löytyy, käytetään hänen vanhaa koodinimeään.
        // Muussa tapauksessa käytetään localStoragessa olevaa nimeä.
        const player: Player = {
          uid: user!.uid,
          codename: existingPlayer?.codename ?? codename,
          score: existingPlayer?.score ?? 0,
          guess: existingPlayer?.guess ?? null,
        };

        await joinSession(player, sharedSession.id);

        if (cancelled) return;

        // Tallennetaan sama nimi myös selaimen muistiin
        setCodename(player.codename);
        localStorage.setItem(
          `codename_${user!.uid}`,
          player.codename
        );

        // Kuunnellaan pelisession muutoksia
        unsubscribeSession = subscribeToSession(
          sharedSession.id,
          (updatedSession) => {
            setSession(updatedSession);
          }
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Pelin lataaminen epäonnistui."
          );
        }
      } finally {
        if (!cancelled) {
          setGameLoading(false);
        }
      }
    }

    initializeGame();

    return () => {
      cancelled = true;
      unsubscribeSession?.();
    };
  }, [user, codename]);

  // Lähetetään arvaus
  async function handleSubmitGuess(guess: number) {
    if (!session || !user) return;

    try {
      setError(null);
      await submitGuess(session.id, user.uid, guess);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Arvauksen lähettäminen epäonnistui."
      );
    }
  }

  // Aloitetaan peli vain, kun pelaajia on vähintään kaksi
  async function handleStartGame() {
    if (!session || session.players.length < 2) return;

    try {
      setError(null);
      await startGameIfPossible(session.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Pelin aloittaminen epäonnistui."
      );
    }
  }

  // Siirrytään seuraavaan kierrokseen
  async function handleNextRound() {
    if (!session) return;

    try {
      setError(null);
      await nextRound(session.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Seuraavan kierroksen aloittaminen epäonnistui."
      );
    }
  }

  // Tyhjennetään pelaajat
  async function handleClearPlayers() {
    if (!session) return;

    const confirmed = window.confirm(
      "Haluatko varmasti tyhjentää kaikki pelaajat?"
    );

    if (!confirmed) return;

    try {
      setError(null);
      await clearPlayers(session.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Pelaajien tyhjentäminen epäonnistui."
      );
    }
  }

  // Palautetaan peli uutta peliä varten
  async function handleResetGame() {
    if (!session) return;

    try {
      setError(null);
      await resetGame(session.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Pelin palauttaminen epäonnistui."
      );
    }
  }

  // Sovelluksen lataus
  if (loading) {
    return (
      <section id="center">
        <p>Ladataan sovellusta...</p>
      </section>
    );
  }

  // Kirjautumisnäkymä
  if (!user) {
    return (
      <section id="center">
        <div className="hero">
          <img
            src={heroImg}
            className="base"
            width="170"
            height="179"
            alt=""
          />
          <img
            src={reactLogo}
            className="framework"
            alt="React logo"
          />
          <img
            src={viteLogo}
            className="vite"
            alt="Vite logo"
          />
        </div>

        <h1>Hintavisa</h1>
        <p>Kirjaudu sisään pelataksesi!</p>
        <LoginForm />
      </section>
    );
  }

  // Pelin lataus
  if (!codename || gameLoading) {
    return (
      <section id="center">
        <div className="hero">
          <img
            src={heroImg}
            className="base"
            width="170"
            height="179"
            alt=""
          />
          <img
            src={reactLogo}
            className="framework"
            alt="React logo"
          />
          <img
            src={viteLogo}
            className="vite"
            alt="Vite logo"
          />
        </div>

        <h1>Hintavisa</h1>
        <p>Ladataan peliä...</p>
      </section>
    );
  }

  // Jos pelin lataaminen epäonnistuu
 if (!session) {
  return (
    <section id="center">
      <h1>Hintavisa</h1>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <p>
        Peliä ei voitu ladata tai peli on jo alkanut.
      </p>

      <button
        type="button"
        onClick={async () => {
          try {
            setError(null);
            await resetGame("shared-game");
            window.location.reload();
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
                : "Pelin palauttaminen epäonnistui."
            );
          }
        }}
      >
        Palauta peli alusta
      </button>

      <button type="button" onClick={() => logout()}>
        Kirjaudu ulos
      </button>
    </section>
  );
  }


  // Varsinainen pelinäkymä
  return (
    <section id="center">
      <div className="hero">
        <img
          src={heroImg}
          className="base"
          width="170"
          height="179"
          alt=""
        />
        <img
          src={reactLogo}
          className="framework"
          alt="React logo"
        />
        <img
          src={viteLogo}
          className="vite"
          alt="Vite logo"
        />
      </div>

      <p>
         Web Analytics -seurantaa voisi hyödyntää esimerkiksi sovelluksen käytön ja käyttäjien toiminnan seuraamiseen. Voidaan selvittää, kuinka paljon sovelluksella on kävijöitä sekä sivujen vierailijamääriä. Esim. Hintavisan kohdalla voidaan tarkkaila kuinka moni käy pelaamassa ja kuinka aktiivisesti. Analytiikan avulla sovellusta voisi kehittää käyttäjäystävällisemmäksi ja parantaa sen toimivuutta. 

         CORS-ongelmat voi välttää esim sallimalla vain luotetut verkkotunnukset tai käyttämällä palvelinpuolen välityspalvelinta (proxy), joka käsittelee pyynnöt ja välittää ne eteenpäin. 
      </p>

      <h1>Hintavisa</h1>

      <p>
        {user.email} ({codename})
      </p>

      <button
        type="button"
        className="counter"
        onClick={() => logout()}
      >
        Kirjaudu ulos
      </button>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <hr />

      {session.status === "waiting" && (
        <>
          <h2>Odotetaan pelaajia</h2>

          <p>
            Pelaajia: {session.players.length}/4
          </p>

          <ul>
            {session.players.map((player) => (
              <li key={player.uid}>
                {player.codename}
                {player.uid === user.uid ? " (sinä)" : ""}
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={handleStartGame}
            disabled={session.players.length < 2}
          >
            Aloita peli
          </button>

          {session.players.length < 2 && (
            <p>
              Tarvitaan vähintään kaksi pelaajaa pelin aloittamiseen.
            </p>
          )}

          <button
            type="button"
            onClick={handleClearPlayers}
          >
            Tyhjennä pelaajat
          </button>
        </>
      )}

      {session.status === "playing" && (
        <>
          <h2>
            Kierros {session.currentRound}/{session.maxRounds}
          </h2>

          {session.currentProduct && (
            <QuizForm
              players={session.players}
              currentUserId={user.uid}
              currentProduct={session.currentProduct}
              correctPrice={session.correctPrice}
              onSubmitGuess={handleSubmitGuess}
              onNextRound={handleNextRound}
            />
          )}

          <h3>Pisteet</h3>

          <ul>
            {session.players.map((player) => (
              <li key={player.uid}>
                {player.codename}: {player.score} pistettä
                {player.guess !== null
                  ? " – Arvaus lähetetty"
                  : ""}
              </li>
            ))}
          </ul>
        </>
      )}

      {session.status === "finished" && (
        <>
          <h2>Peli päättyi!</h2>

          <h3>Voittaja: {session.winnerCodename}</h3>

          <h3>Lopputulokset</h3>

          <ol>
            {[...session.players]
              .sort((a, b) => b.score - a.score)
              .map((player) => (
                <li key={player.uid}>
                  {player.codename}: {player.score} pistettä
                </li>
              ))}
          </ol>

          <button
            type="button"
            onClick={handleResetGame}
          >
            Uusi peli
          </button>
        </>
      )}
    </section>
  );
}

function AppViikko6() {
  return (
    <>
      <RouteAnalytics />
      <AppViikko6Content />
      <ConsentBanner />
    </>
  );
}

export default AppViikko6;
