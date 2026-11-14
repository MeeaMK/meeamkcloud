import Viikko3 from "./viikko3";
import Viikko4 from "./viikko4";

function App() {
  const isWeek4 = window.location.hash === "#/viikko4";

  return isWeek4 ? <Viikko4 /> : <Viikko3 />;
}

export default App;
