import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
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
  const [codename, setCodename] = useState<string | null>(
    localStorage.getItem('codename')
  )

  function createCodename() {
    const newCodename = generateCodename()
    localStorage.setItem('codename', newCodename)
    setCodename(newCodename)
  }

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>

        <div>
          <h1>Koodinimen generointi</h1>
        </div>

        <button
          type="button"
          className="counter"
          onClick={createCodename}
        >
          Luo uusi koodinimi!
        </button>

        {codename && (
          <div>
            <h2>Koodinimesi:</h2>
            <h1 className="codename">{codename}</h1>
          </div>
        )}
      </section>
    </>
  )
}

export default App
