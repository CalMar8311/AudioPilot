// Dynamic Section Arrangement Builder - Drag-and-drop song structure builder

import { useState, useCallback } from 'react';
import { GripVertical, Plus, Trash2, Zap, Layers } from 'lucide-react';
import { SectionCard } from '@/components/ui';
import type { PromptEngine } from '@/engine/usePromptEngine';

const AVAILABLE_SECTIONS = [
  { id: 'intro', label: 'Intro', defaultEnergy: 'Build-up' },
  { id: 'verse1', label: 'Verse 1', defaultEnergy: 'Intimate' },
  { id: 'pre-chorus', label: 'Pre-Chorus', defaultEnergy: 'Rising' },
  { id: 'chorus', label: 'Chorus', defaultEnergy: 'Anthemic' },
  { id: 'verse2', label: 'Verse 2', defaultEnergy: 'Intimate' },
  { id: 'bridge', label: 'Bridge', defaultEnergy: 'Emotional' },
  { id: 'drop', label: 'Drop', defaultEnergy: 'High Energy' },
  { id: 'solo', label: 'Guitar Solo', defaultEnergy: 'Showcase' },
  { id: 'outro', label: 'Outro', defaultEnergy: 'Fading' },
];

const ENERGY_LEVELS = [
  { id: 'minimal', label: 'Minimal', color: 'text-neon-cyan' },
  { id: 'intimate', label: 'Intimate', color: 'text-neon-lime' },
  { id: 'rising', label: 'Rising', color: 'text-neon-amber' },
  { id: 'anthemic', label: 'Anthemic', color: 'text-neon-magenta' },
  { id: 'high-energy', label: 'High Energy', color: 'text-neon-rose' },
];

interface SectionBlock {
  id: string;
  label: string;
  energy: string;
}

export function SectionArrangementBuilder({ eng }: { eng: PromptEngine }) {
  const { state, update, showToast } = eng;
  
  const [arrangedSections, setArrangedSections] = useState<SectionBlock[]>([
    { id: 'intro', label: 'Intro', energy: 'Build-up' },
    { id: 'verse1', label: 'Verse 1', energy: 'Intimate' },
    { id: 'pre-chorus', label: 'Pre-Chorus', energy: 'Rising' },
    { id: 'chorus', label: 'Chorus', energy: 'Anthemic' },
    { id: 'outro', label: 'Outro', energy: 'Fading' },
  ]);

  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const addSection = useCallback((section: typeof AVAILABLE_SECTIONS[0]) => {
    if (arrangedSections.length >= 12) {
      showToast('Maximum 12 sections allowed');
      return;
    }
    setArrangedSections([...arrangedSections, { 
      id: section.id, 
      label: section.label, 
      energy: section.defaultEnergy 
    }]);
    showToast(`Added ${section.label}`);
  }, [arrangedSections, showToast]);

  const removeSection = useCallback((index: number) => {
    setArrangedSections(arrangedSections.filter((_, i) => i !== index));
    setSelectedSection(null);
    showToast('Section removed');
  }, [arrangedSections, showToast]);

  const moveSection = useCallback((fromIndex: number, toIndex: number) => {
    const newSections = [...arrangedSections];
    const [moved] = newSections.splice(fromIndex, 1);
    newSections.splice(toIndex, 0, moved);
    setArrangedSections(newSections);
  }, [arrangedSections]);

  const updateSectionEnergy = useCallback((index: number, energy: string) => {
    const newSections = [...arrangedSections];
    newSections[index].energy = energy;
    setArrangedSections(newSections);
  }, [arrangedSections]);

  const handleDrop = useCallback((targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    setArrangedSections(prev => {
      const next = [...prev];
      const [moved] = next.splice(draggedIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setSelectedSection(null);
    setDraggedIndex(null);
    setDragOverIndex(null);
    showToast('Section reordered');
  }, [draggedIndex, showToast]);

  const applyToLyrics = useCallback(() => {
    const structureText = arrangedSections
      .map(s => `[${s.label}]`)
      .join('\n\n');
    update('lyrics', structureText);
    showToast('Structure applied to lyrics');
  }, [arrangedSections, update, showToast]);

  return (
    <SectionCard
      title="Section Arrangement Builder"
      icon={<Layers className="w-4 h-4" />}
      accent="cyan"
      right={
        <button
          type="button"
          onClick={applyToLyrics}
          className="btn btn-primary !py-1.5 !text-xs"
        >
          Apply to Lyrics
        </button>
      }
    >
      <p className="text-[11px] text-ink-400 mb-4">
        Drag and drop sections to arrange your song structure. Click sections to set energy instructions.
      </p>

      {/* Available sections palette */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <Plus className="w-3 h-3 text-ink-400" />
          <span className="text-[10px] uppercase tracking-widest text-ink-400">Add sections</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_SECTIONS.filter(section => 
            !arrangedSections.some(s => s.id === section.id)
          ).map(section => (
            <button
              key={section.id}
              type="button"
              onClick={() => addSection(section)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-ink-700/60 bg-ink-850/60 text-ink-300 hover:border-neon-cyan/40 hover:text-neon-cyan transition"
            >
              + {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Arranged sections */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <Layers className="w-3 h-3 text-ink-400" />
          <span className="text-[10px] uppercase tracking-widest text-ink-400">Your structure</span>
        </div>
        
        {arrangedSections.length === 0 ? (
          <div className="glass-soft rounded-lg p-4 text-center">
            <p className="text-[11px] text-ink-400">
              No sections added yet. Click sections above to build your structure.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {arrangedSections.map((section, index) => (
              <div
                key={section.id}
                draggable
                onDragStart={() => setDraggedIndex(index)}
                onDragOver={event => {
                  event.preventDefault();
                  setDragOverIndex(index);
                }}
                onDragLeave={() => setDragOverIndex(current => current === index ? null : current)}
                onDrop={event => {
                  event.preventDefault();
                  handleDrop(index);
                }}
                onDragEnd={() => {
                  setDraggedIndex(null);
                  setDragOverIndex(null);
                }}
                className={`glass-soft rounded-lg p-3 border transition-all cursor-grab active:cursor-grabbing ${
                  dragOverIndex === index ? 'border-neon-cyan bg-neon-cyan/10 translate-y-0.5' :
                  draggedIndex === index ? 'opacity-50' :
                  selectedSection === index 
                    ? 'border-neon-cyan/60 bg-neon-cyan/5' 
                    : 'border-ink-700/50 hover:border-ink-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Drag handle */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveSection(index, Math.max(0, index - 1))}
                      disabled={index === 0}
                      className="p-1 text-ink-400 hover:text-ink-200 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <GripVertical className="w-4 h-4 text-ink-500" title="Drag to reorder" />
                    <button
                      type="button"
                      onClick={() => moveSection(index, Math.min(arrangedSections.length - 1, index + 1))}
                      disabled={index === arrangedSections.length - 1}
                      className="p-1 text-ink-400 hover:text-ink-200 disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </div>

                  {/* Section label */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink-100">[{section.label}]</span>
                      <button
                        type="button"
                        onClick={() => setSelectedSection(selectedSection === index ? null : index)}
                        className="text-[10px] text-ink-400 hover:text-neon-cyan transition"
                     >
                        {selectedSection === index ? 'Close' : 'Edit Energy'}
                      </button>
                    </div>

                    {/* Energy modifier */}
                    {selectedSection === index && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {ENERGY_LEVELS.map(energy => (
                          <button
                            key={energy.id}
                            type="button"
                            onClick={() => updateSectionEnergy(index, energy.label)}
                            className={
                              'px-2 py-1 rounded text-[10px] font-medium border transition-all ' +
                              (section.energy === energy.label
                                ? `bg-neon-cyan/15 border-neon-cyan/60 ${energy.color}`
                                : 'bg-ink-850/60 border-ink-700/60 text-ink-300 hover:border-neon-cyan/40')
                            }
                          >
                            {energy.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Current energy display */}
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-neon-amber" />
                      <span className="text-[10px] text-ink-300">{section.energy}</span>
                    </div>
                  </div>

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => removeSection(index)}
                    className="p-1.5 text-ink-400 hover:text-neon-rose transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="mt-4 glass-soft rounded-lg p-3">
        <p className="text-[10px] text-ink-400">
          <strong className="text-ink-300">Tip:</strong> Click "Edit Energy" on any section to set dynamic energy instructions (e.g., "Intimate & Minimal" for verses, "Anthemic Layered Harmonies" for choruses).
        </p>
      </div>
    </SectionCard>
  );
}
