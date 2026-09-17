import { DawShell } from '@/components/daw/DawShell';
import { usePromptEngine } from '@/engine/usePromptEngine';
import type { Preset } from '@/data/catalogs';

function App() {
  const eng = usePromptEngine();

  const handlePresetSelect = (preset: Preset) => eng.loadPreset(preset);
  const handleEraSelect    = (label: string): boolean => { eng.applyMicroGenreRecipe(label); return true; };

  return (
    <DawShell
      eng={eng}
      onPresetSelect={handlePresetSelect}
      onEraSelect={handleEraSelect}
    />
  );
}

export default App;
