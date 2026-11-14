import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, logout } from "./authService";
import LoginForm from "./LoginForm";

function Viikko4() {
  const [user, setUser] = useState<User | null>(null);
  const [codename, setCodename] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const storageKey = `codename_${firebaseUser.uid}`;
        let savedCodename = localStorage.getItem(storageKey);

        if (!savedCodename) {
          const adjectives = ["Salainen", "Nopea", "Hiljainen", "Älykäs"];
          const animals = ["Kettu", "Susi", "Pöllö", "Tiikeri"];

          const adjective =
            adjectives[Math.floor(Math.random() * adjectives.length)];
          const animal = animals[Math.floor(Math.random() * animals.length)];

          savedCodename = `${adjective} ${animal}`;
          localStorage.setItem(storageKey, savedCodename);
        }

        setCodename(savedCodename);
      } else {
        setCodename("");
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div>
      {user ? (
        <>
          <h1>Tervetuloa, {codename}!</h1>
          <p>Olet kirjautunut sisään käyttäjällä {user.email}.</p>
          <button onClick={logout}>Kirjaudu ulos</button>
        </>
      ) : (
        <LoginForm />
      )}
    </div>
  );
}

export default Viikko4;
