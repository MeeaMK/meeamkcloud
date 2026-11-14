import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import LoginForm from './LoginForm'
import { auth, logout } from './authService'
import './App.css'

function generateCodename() {
  const adjectives = ["Pinkki", "Hassu", "Hiljainen", "Hullu", "Tyylikäs", "Hidas"]
  const animals = ["Kettu", "Gerbiili", "Lisko", "Linnu", "Robotti"]
  const number = Math.floor(Math.random() * 3000)

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const animal = animals[Math.floor(Math.random() * animals.length)]

  return `${adj}${animal}${number}`
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [codename, setCodename] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Seurataan Firebase-kirjautumisen tilaa
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Haetaan tai luodaan käyttäjän oma koodinimi
  useEffect(() => {
    if (user) {
      const storageKey = `codename_${user.uid}`
      let savedCodename = localStorage.getItem(storageKey)

      if (!savedCodename) {
        savedCodename = generateCodename()
        localStorage.setItem(storageKey, savedCodename)
      }

      setCodename(savedCodename)
    } else {
      setCodename(null)
    }
  }, [user])

  // Luodaan käyttäjälle uusi koodinimi
  function createCodename() {
    if (!user) return

    const newCodename = generateCodename()
    const storageKey = `codename_${user.uid}`

    localStorage.setItem(storageKey, newCodename)
    setCodename(newCodename)
  }

  if (loading) {
    return <p>Ladataan sovellusta...</p>
  }

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>

        {user ? (
          <>
            <h1>Tervetuloa!</h1>

            <p>Olet kirjautunut sisään käyttäjänä:</p>
            <p>{user.email}</p>

            <h2>Koodinimesi:</h2>
            <h1 className="codename">{codename}</h1>

            <button
              type="button"
              className="counter"
              onClick={createCodename}
            >
              Luo uusi koodinimi!
            </button>

            <div>
              <button type="button" onClick={logout}>
                Kirjaudu ulos
              </button>
            </div>
          </>
        ) : (
          <LoginForm />
        )}
      </section>
    </>
  )
}

export default App
