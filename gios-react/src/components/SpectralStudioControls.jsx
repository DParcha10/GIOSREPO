import React from 'react';
import { 
  Sliders, Eye, Palette, Sparkles, RefreshCw, Layers, Flame, Info, Check
} from 'lucide-react';
import { 
  SPECTRAL_INDICES as BASE_INDICES, 
  COLORMAPS as BASE_COLORMAPS,
  parseRescale,
  validateSpectralIndex,
  validateColormap
} from '../config/constants';

const COLORMAP_GRADIENTS = {
  spectral: 'from-blue-600 via-green-400 via-yellow-400 to-red-600',
  viridis: 'from-purple-900 via-teal-500 to-yellow-300',
  turbo: 'from-blue-700 via-cyan-400 via-green-400 via-yellow-400 to-red-600',
  rdylbu: 'from-red-600 via-yellow-300 to-blue-600',
  terrain: 'from-blue-700 via-emerald-600 via-yellow-600 to-stone-200',
  magma: 'from-black via-purple-800 via-pink-600 to-amber-300',
  inferno: 'from-black via-red-800 via-amber-500 to-yellow-200',
  cividis: 'from-blue-950 via-teal-700 to-yellow-400'
};

export const COLORMAP_PALETTES = BASE_COLORMAPS.map(c => ({
  id: c.key,
  key: c.key,
  name: c.label.split(' (')[0],
  desc: c.label,
  gradient: c.gradientCss || COLORMAP_GRADIENTS[c.key] || 'from-teal-500 to-purple-600'
}));

export const SPECTRAL_INDICES = BASE_INDICES.map(i => {
  const [defMin, defMax] = parseRescale(i.defaultRescale, [-0.2, 0.6]);
  return {
    id: i.key,
    key: i.key,
    name: i.name,
    label: i.label,
    formula: i.formula,
    domain: i.domain,
    description: i.description,
    isDifferenced: Boolean(i.isDifferenced),
    requiresThermal: Boolean(i.requiresThermal),
    requiresRedEdge: Boolean(i.requiresRedEdge),
    defaultMin: defMin,
    defaultMax: defMax,
    autoMin: i.autoStretch ? i.autoStretch[0] : (i.key === 'ndmi' ? 0.05 : i.key === 'ndvi' ? 0.15 : i.key === 'lst' ? 12 : i.key === 'rgb' ? 10 : i.key === 'dnbr' ? 0.1 : i.key === 'rdnbr' ? 0.15 : defMin + 0.1),
    autoMax: i.autoStretch ? i.autoStretch[1] : (i.key === 'ndmi' ? 0.45 : i.key === 'ndvi' ? 0.85 : i.key === 'lst' ? 42 : i.key === 'rgb' ? 240 : i.key === 'dnbr' ? 0.66 : i.key === 'rdnbr' ? 1.2 : defMax - 0.1)
  };
});

export default function SpectralStudioControls({
  activeBand = 'ndmi',
  onBandChange,
  activeColormap = 'spectral',
  onColormapChange,
  rescaleMin = -0.2,
  rescaleMax = 0.6,
  onRescaleChange,
  layerOpacity = 0.85,
  onOpacityChange,
  isFloating = false
}) {
  const validatedBand = validateSpectralIndex(activeBand, 'ndmi');
  const validatedColormap = validateColormap(activeColormap, 'spectral');
  const currentIdxMeta = SPECTRAL_INDICES.find(i => i.id === validatedBand) || SPECTRAL_INDICES[0];
  const currentColormapMeta = COLORMAP_PALETTES.find(c => c.id === validatedColormap) || COLORMAP_PALETTES[0];

  const handleAutoStretch = () => {
    if (onRescaleChange && currentIdxMeta) {
      onRescaleChange(currentIdxMeta.autoMin, currentIdxMeta.autoMax);
    }
  };

  const handleResetStretch = () => {
    if (onRescaleChange && currentIdxMeta) {
      onRescaleChange(currentIdxMeta.defaultMin, currentIdxMeta.defaultMax);
    }
  };

  return (
    <div className={`flex flex-col gap-4 font-sans text-gray-200 ${isFloating ? 'glass-panel p-4 max-w-sm !rounded-xl shadow-2xl border-primary/30' : ''}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-primary" />
          <span className="font-['Orbitron'] font-bold text-xs uppercase tracking-wider text-white">
            Spectral Symbology Studio
          </span>
        </div>
        <button
          onClick={handleAutoStretch}
          className="px-2.5 py-1 rounded bg-teal-500/15 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 transition-all"
          title="Calculate 2%–98% Cumulative Cut for optimal dynamic contrast"
        >
          <Sparkles className="w-3 h-3 text-teal-400" />
          <span>2%–98% Auto Stretch</span>
        </button>
      </div>

      {/* Spectral Index Selector */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono flex items-center justify-between">
          <span>Active Biophysical Index</span>
          <span className="text-teal-400">{currentIdxMeta.name}</span>
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {SPECTRAL_INDICES.map(idx => (
            <button
              key={idx.id}
              onClick={() => {
                if (onBandChange) onBandChange(idx.id);
                if (onRescaleChange) onRescaleChange(idx.defaultMin, idx.defaultMax);
              }}
              className={`py-1.5 px-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all border flex items-center justify-center gap-1 ${
                activeBand === idx.id
                  ? 'border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(0,255,170,0.3)]'
                  : 'border-gray-800 hover:border-gray-700 bg-black/40 text-gray-400 hover:text-white'
              }`}
            >
              <span>{idx.name}</span>
              {idx.isDifferenced && (
                <span className="text-[7px] px-1 py-0.5 rounded bg-amber-500/25 text-amber-300 font-mono font-bold" title="Differenced pre/post index">Δ</span>
              )}
              {idx.requiresThermal && (
                <span className="text-[7px] px-1 py-0.5 rounded bg-red-500/25 text-red-300 font-mono font-bold" title="Thermal infrared (°C)">T</span>
              )}
              {idx.requiresRedEdge && (
                <span className="text-[7px] px-1 py-0.5 rounded bg-emerald-500/25 text-emerald-300 font-mono font-bold" title="Red-Edge band required">RE</span>
              )}
            </button>
          ))}
        </div>
        <div className="text-[9px] text-gray-500 font-mono truncate">
          Formula: {currentIdxMeta.formula}
        </div>
        {currentIdxMeta.isDifferenced && (
          <div className="text-[9px] text-amber-300 font-mono bg-amber-500/10 border border-amber-500/30 p-1.5 rounded flex items-center gap-1.5">
            <Flame className="w-3 h-3 text-amber-400 shrink-0" />
            <span>Multi-temporal differenced index: computes pre- vs post-event change (USGS FIREMON).</span>
          </div>
        )}
        {currentIdxMeta.requiresThermal && (
          <div className="text-[9px] text-red-300 font-mono bg-red-500/10 border border-red-500/30 p-1.5 rounded flex items-center gap-1.5">
            <Info className="w-3 h-3 text-red-400 shrink-0" />
            <span>Thermal infrared index: calibrated directly to Land Surface Temperature in °C ($T_C$).</span>
          </div>
        )}
        {currentIdxMeta.requiresRedEdge && (
          <div className="text-[9px] text-emerald-300 font-mono bg-emerald-500/10 border border-emerald-500/30 p-1.5 rounded flex items-center gap-1.5">
            <Info className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>Chlorophyll index: requires Sentinel-2 RedEdge 1 (B05) band for HAB quantification.</span>
          </div>
        )}
      </div>

      {/* Dynamic Colormap Selector */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono flex items-center justify-between">
          <span className="flex items-center gap-1"><Palette className="w-3 h-3 text-purple-400" /> Colormap Palette</span>
          <span className="text-purple-300 capitalize font-bold">{currentColormapMeta.name}</span>
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {COLORMAP_PALETTES.map(cmap => (
            <button
              key={cmap.id}
              onClick={() => onColormapChange && onColormapChange(cmap.id)}
              className={`p-1.5 rounded border text-left flex flex-col gap-1 transition-all ${
                activeColormap === cmap.id
                  ? 'border-purple-400 bg-purple-500/15 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                  : 'border-gray-800 hover:border-gray-700 bg-black/40'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-semibold text-gray-200">
                <span>{cmap.name}</span>
                {activeColormap === cmap.id && <Check className="w-2.5 h-2.5 text-purple-400" />}
              </div>
              <div className={`h-1.5 w-full rounded-full bg-gradient-to-r ${cmap.gradient}`}></div>
            </button>
          ))}
        </div>
      </div>

      {/* Rescale Range (Min / Max Cumulative Sliders) */}
      <div className="space-y-2 pt-1 border-t border-gray-800/60">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-gray-400 uppercase font-bold">Contrast Rescale Window</span>
          <span className="text-teal-300 font-bold font-mono">[{rescaleMin.toFixed(activeBand === 'rgb' ? 0 : 2)}, {rescaleMax.toFixed(activeBand === 'rgb' ? 0 : 2)}]</span>
        </div>

        {/* Dynamic Color Ramp Preview */}
        <div className="space-y-1">
          <div className={`h-3 w-full rounded-md shadow-inner bg-gradient-to-r ${currentColormapMeta.gradient}`}></div>
          <div className="flex justify-between text-[9px] font-mono text-gray-400">
            <span>Min: {rescaleMin.toFixed(activeBand === 'rgb' ? 0 : 2)}</span>
            <span className="text-gray-500">Center</span>
            <span>Max: {rescaleMax.toFixed(activeBand === 'rgb' ? 0 : 2)}</span>
          </div>
        </div>

        {/* Dual Controls */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-mono text-gray-400">
              <span>Cut Min</span>
              <span className="text-white">{rescaleMin.toFixed(activeBand === 'rgb' ? 0 : 2)}</span>
            </div>
            <input
              type="range"
              min={activeBand === 'lst' ? -10 : activeBand === 'rgb' ? 0 : activeBand === 'rdnbr' ? -1.0 : -1.0}
              max={rescaleMax - (activeBand === 'rgb' ? 1 : 0.05)}
              step={activeBand === 'rgb' ? 1 : activeBand === 'lst' ? 0.5 : 0.02}
              value={rescaleMin}
              onChange={(e) => onRescaleChange && onRescaleChange(parseFloat(e.target.value), rescaleMax)}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-400"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-mono text-gray-400">
              <span>Cut Max</span>
              <span className="text-white">{rescaleMax.toFixed(activeBand === 'rgb' ? 0 : 2)}</span>
            </div>
            <input
              type="range"
              min={rescaleMin + (activeBand === 'rgb' ? 1 : 0.05)}
              max={activeBand === 'lst' ? 60 : activeBand === 'rgb' ? 255 : activeBand === 'rdnbr' ? 2.5 : 1.0}
              step={activeBand === 'rgb' ? 1 : activeBand === 'lst' ? 0.5 : 0.02}
              value={rescaleMax}
              onChange={(e) => onRescaleChange && onRescaleChange(rescaleMin, parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-400"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={handleResetStretch}
            className="text-[9px] text-gray-400 hover:text-white font-mono flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="w-2.5 h-2.5" /> Reset Default Scale
          </button>
        </div>
      </div>

      {/* Layer Opacity Slider */}
      <div className="space-y-1 pt-1 border-t border-gray-800/60">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-gray-400 uppercase font-bold flex items-center gap-1">
            <Eye className="w-3 h-3 text-secondary" /> Tile Layer Opacity
          </span>
          <span className="text-white font-bold">{Math.round(layerOpacity * 100)}%</span>
        </div>
        <input
          type="range"
          min={0.0}
          max={1.0}
          step={0.05}
          value={layerOpacity}
          onChange={(e) => onOpacityChange && onOpacityChange(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
        />
      </div>

      {/* Scientific Tradeoff 4 Regulatory Disclaimer */}
      <div className="p-2.5 rounded-lg bg-black/40 border border-gray-800/80 flex items-start gap-2 text-[9px] text-gray-400 leading-relaxed font-mono">
        <Info className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
        <span>
          <strong>Scientific Notice:</strong> Display stretched for visual inspection; pixel values represent true calibrated biophysical metrics.
        </span>
      </div>

    </div>
  );
}
