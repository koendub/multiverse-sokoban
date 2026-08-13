import { sampleLevel } from "./engine/levels/sampleLevel.ts";
import { GameView } from "./components/GameView.tsx";

function App() {
  return <GameView level={sampleLevel} />;
}

export default App;
