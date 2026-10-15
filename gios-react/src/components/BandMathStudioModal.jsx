import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  X, Calculator, Play, Check, AlertTriangle, CheckCircle2,
  Layers, Copy, RotateCcw, Sliders, Sparkles, Code,
  Binary, BookOpen, Search, ArrowRight, Gauge
} from 'lucide-react';
import {
  BAND_MATH_PRESETS,
  VALID_BAND_MATH_FUNCTIONS,
  BAND_NAME_ALIASES,
  BAND_MATH_TOKEN_TYPES,
  BAND_MATH_NODE_TYPES,
  tokenizeBandMath,
  validateBandMathFormula,
  evaluateBandMathFormula,
  buildCustomExpressionTileUrlTemplate
} from '../config/constants';

// Pre-configured Landcover Benchmark Profiles for Scalar Pixel Simulator
const BENCHMARK_LANDCOVER_PROFILES = {
  dense_forest: {
    id: 'dense_forest',
    name: 'Dense Healthy Forest Canopy',
    category: 'Vegetation',
    description: 'High near-infrared chlorophyll scattering and strong red absorption.',
    bands: { B02: 0.05, B03: 0.12, B04: 0.08, B05: 0.18, B06: 0.45, B07: 0.58, B08: 0.65, B8A: 0.66, B11: 0.15, B12: 0.08 }
  },
  water_body: {
    id: 'water_body',
    name: 'Deep Clear Water Impoundment',
    category: 'Water',
    description: 'Moderate blue-green reflectance with near-total absorption in NIR and SWIR.',
    bands: { B02: 0.16, B03: 0.12, B04: 0.04, B05: 0.03, B06: 0.02, B07: 0.02, B08: 0.02, B8A: 0.02, B11: 0.01, B12: 0.01 }
  },
  turbid_tailings: {
    id: 'turbid_tailings',
    name: 'Turbid Mine Tailings Impoundment',
    category: 'Mining',
    description: 'Elevated suspended particulate solids and dissolved metal complexes.',
    bands: { B02: 0.24, B03: 0.20, B04: 0.18, B05: 0.15, B06: 0.12, B07: 0.10, B08: 0.08, B8A: 0.07, B11: 0.05, B12: 0.03 }
  },
  bare_soil_mine: {
    id: 'bare_soil_mine',
    name: 'Arid Exposed Soil & Mine Pit',
    category: 'Geology',
    description: 'Bright monotonic mineral reflectance increasing steadily from blue to SWIR.',
    bands: { B02: 0.18, B03: 0.24, B04: 0.35, B05: 0.34, B06: 0.35, B07: 0.36, B08: 0.32, B8A: 0.33, B11: 0.48, B12: 0.42 }
  },
  burn_scar: {
    id: 'burn_scar',
    name: 'Wildfire Burn Scar & Ash',
    category: 'Hazard',
    description: 'Severely depleted NIR vegetation canopy with high SWIR char exposure.',
    bands: { B02: 0.09, B03: 0.12, B04: 0.20, B05: 0.14, B06: 0.13, B07: 0.12, B08: 0.10, B8A: 0.11, B11: 0.38, B12: 0.44 }
  },
  iron_alteration: {
    id: 'iron_alteration',
    name: 'Ferric Iron / Gossan Outcrop',
    category: 'Minerals',
    description: 'Intense red-to-blue absorption gradient indicating hematite and goethite.',
    bands: { B02: 0.11, B03: 0.18, B04: 0.42, B05: 0.30, B06: 0.28, B07: 0.26, B08: 0.22, B8A: 0.23, B11: 0.39, B12: 0.28 }
  }
};

// Common sensor band catalogs for quick button insertion
const SENSOR_BANDS = {
  'sentinel-2': [
    { code: 'B02', label: 'B02 (Blue, 490nm)', color: 'border-blue-500/50 bg-blue-950/40 text-blue-300' },
    { code: 'B03', label: 'B03 (Green, 560nm)', color: 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300' },
    { code: 'B04', label: 'B04 (Red, 665nm)', color: 'border-red-500/50 bg-red-950/40 text-red-300' },
    { code: 'B05', label: 'B05 (RedEdge 1, 705nm)', color: 'border-rose-500/50 bg-rose-950/40 text-rose-300' },
    { code: 'B06', label: 'B06 (RedEdge 2, 740nm)', color: 'border-rose-500/50 bg-rose-950/40 text-rose-300' },
    { code: 'B07', label: 'B07 (RedEdge 3, 783nm)', color: 'border-rose-500/50 bg-rose-950/40 text-rose-300' },
    { code: 'B08', label: 'B08 (Broad NIR, 842nm)', color: 'border-purple-500/50 bg-purple-950/40 text-purple-300' },
    { code: 'B8A', label: 'B8A (Narrow NIR, 865nm)', color: 'border-purple-500/50 bg-purple-950/40 text-purple-300' },
    { code: 'B11', label: 'B11 (SWIR 1, 1610nm)', color: 'border-amber-500/50 bg-amber-950/40 text-amber-300' },
    { code: 'B12', label: 'B12 (SWIR 2, 2190nm)', color: 'border-orange-500/50 bg-orange-950/40 text-orange-300' },
    { code: 'B01', label: 'B01 (Coastal, 443nm)', color: 'border-cyan-500/50 bg-cyan-950/40 text-cyan-300' },
    { code: 'B09', label: 'B09 (Water Vapor, 945nm)', color: 'border-teal-500/50 bg-teal-950/40 text-teal-300' }
  ],
  'aliases': [
    { code: 'NIR', label: 'NIR (B08)', color: 'border-purple-500/50 bg-purple-950/40 text-purple-300' },
    { code: 'RED', label: 'RED (B04)', color: 'border-red-500/50 bg-red-950/40 text-red-300' },
    { code: 'GREEN', label: 'GREEN (B03)', color: 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300' },
    { code: 'BLUE', label: 'BLUE (B02)', color: 'border-blue-500/50 bg-blue-950/40 text-blue-300' },
    { code: 'SWIR1', label: 'SWIR1 (B11)', color: 'border-amber-500/50 bg-amber-950/40 text-amber-300' },
    { code: 'SWIR2', label: 'SWIR2 (B12)', color: 'border-orange-500/50 bg-orange-950/40 text-orange-300' },
    { code: 'REDEDGE1', label: 'REDEDGE1 (B05)', color: 'border-rose-500/50 bg-rose-950/40 text-rose-300' }
  ],
  'drone': [
    { code: 'DRONE_RED', label: 'Drone Red (R)', color: 'border-red-500/50 bg-red-950/40 text-red-300' },
    { code: 'DRONE_GREEN', label: 'Drone Green (G)', color: 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300' },
    { code: 'DRONE_BLUE', label: 'Drone Blue (B)', color: 'border-blue-500/50 bg-blue-950/40 text-blue-300' },
    { code: 'DRONE_NIR', label: 'Drone NIR', color: 'border-purple-500/50 bg-purple-950/40 text-purple-300' },
    { code: 'DRONE_REDEDGE', label: 'Drone RedEdge', color: 'border-rose-500/50 bg-rose-950/40 text-rose-300' }
  ]
};

// Supported Leaflet raster colormaps
const COLORMAP_OPTIONS = [
  { id: 'rdylgn', label: 'Red-Yellow-Green (Vegetation / NDVI)', gradient: 'from-red-500 via-yellow-400 to-emerald-500' },
  { id: 'viridis', label: 'Viridis (Perceptual Uniform)', gradient: 'from-indigo-700 via-emerald-500 to-yellow-300' },
  { id: 'spectral', label: 'Spectral (Moisture / NDMI)', gradient: 'from-red-600 via-yellow-300 to-blue-600' },
  { id: 'blues', label: 'Blues (Water / MNDWI)', gradient: 'from-cyan-100 via-blue-400 to-indigo-900' },
  { id: 'plasma', label: 'Plasma (Thermal / Geology)', gradient: 'from-indigo-900 via-fuchsia-600 to-yellow-300' },
  { id: 'turbo', label: 'Turbo (High Dynamic Range)', gradient: 'from-blue-600 via-emerald-400 via-yellow-400 to-red-600' },
  { id: 'rdylbu', label: 'Red-Yellow-Blue (Burn / NBR)', gradient: 'from-red-600 via-yellow-300 to-blue-600' },
  { id: 'magma', label: 'Magma (Clay / Minerals)', gradient: 'from-black via-rose-700 to-yellow-200' },
  { id: 'inferno', label: 'Inferno (Iron / Weathering)', gradient: 'from-black via-amber-600 to-yellow-300' }
];

/**
 * Visual recursive AST Node hierarchy inspector component.
 */
const ASTNodeTree = ({ node, depth = 0 }) => {
  if (!node || typeof node !== 'object') return null;

  const nodeType = node.type;

  if (nodeType === BAND_MATH_NODE_TYPES.CONSTANT) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 shadow-sm">
        num:{node.value}
      </span>
    );
  }

  if (nodeType === BAND_MATH_NODE_TYPES.VARIABLE) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/80 border border-amber-500/40 text-amber-300 shadow-sm">
        var:{node.name}
      </span>
    );
  }

  if (nodeType === BAND_MATH_NODE_TYPES.UNARY_OP) {
    return (
      <div className="inline-flex items-center gap-1 p-1 bg-zinc-900/80 border border-zinc-700/60 rounded">
        <span className="text-[10px] font-mono font-bold text-pink-400">{node.op}</span>
        <ASTNodeTree node={node.operand} depth={depth + 1} />
      </div>
    );
  }

  if (nodeType === BAND_MATH_NODE_TYPES.BINARY_OP) {
    return (
      <div className="inline-flex flex-wrap items-center gap-1 px-1.5 py-1 bg-zinc-900/90 border border-indigo-500/30 rounded-md">
        <ASTNodeTree node={node.left} depth={depth + 1} />
        <span className="px-1 py-0.2 rounded text-[11px] font-mono font-extrabold bg-indigo-950 text-indigo-300 border border-indigo-500/50">
          {node.op}
        </span>
        <ASTNodeTree node={node.right} depth={depth + 1} />
      </div>
    );
  }

  if (nodeType === BAND_MATH_NODE_TYPES.FUNCTION_CALL) {
    return (
      <div className="inline-flex flex-wrap items-center gap-1 px-1.5 py-1 bg-zinc-900/90 border border-purple-500/40 rounded-md">
        <span className="text-[10px] font-mono font-bold text-purple-300">{node.name}(</span>
        {node.args?.map((arg, idx) => (
          <React.Fragment key={idx}>
            <ASTNodeTree node={arg} depth={depth + 1} />
            {idx < (node.args.length - 1) && <span className="text-[10px] text-zinc-500">,</span>}
          </React.Fragment>
        ))}
        <span className="text-[10px] font-mono font-bold text-purple-300">)</span>
      </div>
    );
  }

  return (
    <span className="text-[10px] font-mono text-zinc-500">{JSON.stringify(node)}</span>
  );
};

export default function BandMathStudioModal({
  isOpen,
  onClose,
  onApplyTileLayer,
  initialFormula = '(B08 - B04) / (B08 + B04)',
  initialColormap = 'rdylgn',
  initialRescale = '-0.2,0.8',
  initialFormulaName = 'Custom Formula'
}) {
  // Navigation & Core States
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'presets' | 'sandbox' | 'tilelayer'
  const [formula, setFormula] = useState(initialFormula);
  const [formulaName, setFormulaName] = useState(initialFormulaName);
  const [selectedSensor, setSelectedSensor] = useState('sentinel-2');
  const [selectedColormap, setSelectedColormap] = useState(initialColormap);
  const [rescaleMin, setRescaleMin] = useState(() => {
    if (typeof initialRescale === 'string' && initialRescale.includes(',')) {
      const parts = initialRescale.split(',').map(Number);
      return Number.isFinite(parts[0]) ? parts[0] : -0.2;
    }
    return -0.2;
  });
  const [rescaleMax, setRescaleMax] = useState(() => {
    if (typeof initialRescale === 'string' && initialRescale.includes(',')) {
      const parts = initialRescale.split(',').map(Number);
      return Number.isFinite(parts[1]) ? parts[1] : 0.8;
    }
    return 0.8;
  });
  const [epsilon, setEpsilon] = useState(1e-6);
  const [presetSearch, setPresetSearch] = useState('');
  const [presetCategory, setPresetCategory] = useState('all');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedFormula, setCopiedFormula] = useState(false);

  // Band reflectance values for Sandbox simulator
  const [sandboxBandValues, setSandboxBandValues] = useState(() => ({
    B02: 0.05,
    B03: 0.12,
    B04: 0.08,
    B05: 0.18,
    B06: 0.45,
    B07: 0.58,
    B08: 0.65,
    B8A: 0.66,
    B11: 0.15,
    B12: 0.08,
    NIR: 0.65,
    RED: 0.08,
    GREEN: 0.12,
    BLUE: 0.05,
    SWIR1: 0.15,
    SWIR2: 0.08,
    DRONE_RED: 0.09,
    DRONE_GREEN: 0.14,
    DRONE_BLUE: 0.06,
    DRONE_NIR: 0.62,
    DRONE_REDEDGE: 0.35
  }));

  const formulaInputRef = useRef(null);

  // Synchronous AST validation & diagnostic extraction
  const validation = useMemo(() => {
    try {
      return validateBandMathFormula(formula, null, selectedSensor === 'sentinel-2' ? 'sentinel-2-l2a' : selectedSensor);
    } catch (err) {
      return {
        is_valid: false,
        formula,
        normalized_formula: formula,
        ast: null,
        bands_detected: [],
        unrecognized_identifiers: [],
        ast_depth: 0,
        node_count: 0,
        syntax_errors: [err.message || String(err)],
        error_message: err.message || String(err)
      };
    }
  }, [formula, selectedSensor]);

  // Synchronous lexical tokenization
  const tokens = useMemo(() => {
    try {
      return tokenizeBandMath(formula);
    } catch {
      return [];
    }
  }, [formula]);

  // Evaluated Sandbox Scalar Value
  const sandboxEvaluation = useMemo(() => {
    if (!validation.is_valid) {
      return {
        success: false,
        value: null,
        error: validation.error_message || 'Invalid formula'
      };
    }
    try {
      const val = evaluateBandMathFormula(formula, sandboxBandValues, epsilon);
      return {
        success: true,
        value: val,
        isFinite: Number.isFinite(val)
      };
    } catch (err) {
      return {
        success: false,
        value: null,
        error: err.message || String(err)
      };
    }
  }, [formula, validation, sandboxBandValues, epsilon]);

  // Dynamic Leaflet Tile URL template
  const tileUrlTemplate = useMemo(() => {
    const rescaleStr = `${rescaleMin},${rescaleMax}`;
    return buildCustomExpressionTileUrlTemplate(formula, {
      colormap: selectedColormap,
      rescale: rescaleStr,
      epsilon
    });
  }, [formula, selectedColormap, rescaleMin, rescaleMax, epsilon]);

  // Insert token or identifier at cursor position
  const handleInsertSnippet = useCallback((snippet) => {
    const input = formulaInputRef.current;
    if (input) {
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const before = formula.substring(0, start);
      const after = formula.substring(end);
      const newFormula = `${before}${snippet}${after}`;
      setFormula(newFormula);

      // Restore focus and cursor position after insertion
      setTimeout(() => {
        input.focus();
        const nextPos = start + snippet.length;
        input.setSelectionRange(nextPos, nextPos);
      }, 0);
    } else {
      setFormula((prev) => `${prev} ${snippet}`);
    }
  }, [formula]);

  // Load preset into editor
  const handleLoadPreset = (preset) => {
    setFormula(preset.formula);
    setFormulaName(preset.name);
    if (preset.default_colormap) setSelectedColormap(preset.default_colormap);
    if (Array.isArray(preset.default_rescale) && preset.default_rescale.length === 2) {
      setRescaleMin(preset.default_rescale[0]);
      setRescaleMax(preset.default_rescale[1]);
    }
    setActiveTab('editor');
  };

  // Load landcover benchmark profile in sandbox
  const handleLoadLandcoverProfile = (profile) => {
    setSandboxBandValues((prev) => ({
      ...prev,
      ...profile.bands
    }));
  };

  // Copy URL template to clipboard
  const handleCopyTileUrl = () => {
    navigator.clipboard.writeText(tileUrlTemplate);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Copy formula text
  const handleCopyFormula = () => {
    navigator.clipboard.writeText(formula);
    setCopiedFormula(true);
    setTimeout(() => setCopiedFormula(false), 2000);
  };

  // Apply to Map action
  const handleApplyToMap = () => {
    if (onApplyTileLayer && validation.is_valid) {
      onApplyTileLayer({
        formula,
        formulaName,
        colormap: selectedColormap,
        rescale: `${rescaleMin},${rescaleMax}`,
        rescaleMin,
        rescaleMax,
        epsilon,
        tileUrlTemplate
      });
    }
    onClose();
  };

  // Filtered preset indices
  const filteredPresets = useMemo(() => {
    const list = Object.values(BAND_MATH_PRESETS);
    return list.filter((p) => {
      const matchesSearch = presetSearch === '' ||
        p.name.toLowerCase().includes(presetSearch.toLowerCase()) ||
        p.formula.toLowerCase().includes(presetSearch.toLowerCase()) ||
        p.id.toLowerCase().includes(presetSearch.toLowerCase()) ||
        p.description.toLowerCase().includes(presetSearch.toLowerCase());
      
      const matchesCategory = presetCategory === 'all' || p.category === presetCategory;
      return matchesSearch && matchesCategory;
    });
  }, [presetSearch, presetCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="relative w-full max-w-6xl max-h-[92vh] bg-zinc-950/95 border border-indigo-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans">
        
        {/* Header */}
        <div className="px-6 py-4 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.25)]">
              <Calculator className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Custom Spectral Formula & Band Math Studio
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-950 text-indigo-300 border border-indigo-500/40">
                  AST Grammar Engine • v2.5.25
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase flex items-center gap-1 ${
                  validation.is_valid
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                    : 'bg-red-950 text-red-300 border border-red-500/40'
                }`}>
                  {validation.is_valid ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>VALID AST ({validation.node_count} nodes)</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3 text-red-400" />
                      <span>SYNTAX ERROR</span>
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Vectorized algebraic AST compiler, recursive-descent parser, sandbox scalar evaluator & dynamic XYZ tilelayer
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            title="Close Band Math Studio"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 py-2.5 bg-zinc-900/40 border-b border-zinc-800 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'editor'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Formula Editor & AST</span>
            <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono ${validation.is_valid ? 'bg-indigo-900 text-indigo-200' : 'bg-red-900 text-red-200'}`}>
              {validation.is_valid ? 'OK' : '!'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('presets')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'presets'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Preset Index Library</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-zinc-800 text-slate-300">
              12 Indices
            </span>
          </button>

          <button
            onClick={() => setActiveTab('sandbox')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'sandbox'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Scalar Pixel Sandbox</span>
            <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono ${sandboxEvaluation.success ? 'bg-emerald-950 text-emerald-300' : 'bg-zinc-800 text-zinc-400'}`}>
              {sandboxEvaluation.success ? `${sandboxEvaluation.value.toFixed(3)}` : 'N/A'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('tilelayer')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'tilelayer'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>XYZ TileLayer & Rendering</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-500/40 uppercase">
              {selectedColormap}
            </span>
          </button>
        </div>

        {/* Modal Body / Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: FORMULA EDITOR & AST */}
          {activeTab === 'editor' && (
            <div className="space-y-6">
              
              {/* Top Controls: Name & Sensor */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                    Formula Display Label
                  </label>
                  <input
                    type="text"
                    value={formulaName}
                    onChange={(e) => setFormulaName(e.target.value)}
                    placeholder="e.g. Modified Normalized Difference Vegetation Index"
                    className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                    Sensor Band Specification
                  </label>
                  <select
                    value={selectedSensor}
                    onChange={(e) => setSelectedSensor(e.target.value)}
                    className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="sentinel-2">Sentinel-2 MSI (12 Bands, L2A)</option>
                    <option value="aliases">Standard Aliases (NIR, RED, SWIR)</option>
                    <option value="drone">Drone Multispectral (R, G, B, RE, NIR)</option>
                  </select>
                </div>
              </div>

              {/* Band Variable Insertion Buttons */}
              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    Click to Insert Band Variables:
                  </span>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    Inserted at current cursor position
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(SENSOR_BANDS[selectedSensor] || SENSOR_BANDS['sentinel-2']).map((band) => (
                    <button
                      key={band.code}
                      onClick={() => handleInsertSnippet(band.code)}
                      className={`px-2.5 py-1 rounded text-xs font-mono font-bold border transition-all hover:scale-105 active:scale-95 ${band.color}`}
                      title={band.label}
                    >
                      {band.code}
                    </button>
                  ))}
                </div>
              </div>

              {/* Operators & Mathematical Functions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Arithmetic Operators */}
                <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                  <span className="text-xs font-mono uppercase text-slate-400">
                    Arithmetic Operators:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {['+', '-', '*', '/', '^', '(', ')'].map((op) => (
                      <button
                        key={op}
                        onClick={() => handleInsertSnippet(` ${op} `)}
                        className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-xs font-mono font-bold text-white transition-all hover:scale-105"
                      >
                        {op}
                      </button>
                    ))}
                    <button
                      onClick={() => handleInsertSnippet('0.5')}
                      className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-xs font-mono text-cyan-300"
                    >
                      0.5
                    </button>
                    <button
                      onClick={() => handleInsertSnippet('2.5')}
                      className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-xs font-mono text-cyan-300"
                    >
                      2.5
                    </button>
                  </div>
                </div>

                {/* Safe Mathematical Functions */}
                <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                  <span className="text-xs font-mono uppercase text-slate-400">
                    Safe AST Math Functions:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(VALID_BAND_MATH_FUNCTIONS).map((func) => (
                      <button
                        key={func}
                        onClick={() => handleInsertSnippet(`${func}()`)}
                        className="px-2.5 py-1 rounded bg-purple-950/50 hover:bg-purple-900/60 border border-purple-500/40 text-xs font-mono text-purple-300 transition-all hover:scale-105"
                        title={VALID_BAND_MATH_FUNCTIONS[func].description}
                      >
                        {func}()
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main Formula Input Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-indigo-400" />
                    Algebraic Band Math Equation
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyFormula}
                      className="text-[11px] font-mono text-slate-400 hover:text-white flex items-center gap-1"
                      title="Copy formula text"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedFormula ? 'Copied!' : 'Copy'}</span>
                    </button>
                    <button
                      onClick={() => setFormula('')}
                      className="text-[11px] font-mono text-red-400 hover:text-red-300"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setFormula('(B08 - B04) / (B08 + B04)')}
                      className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset to NDVI
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    ref={formulaInputRef}
                    value={formula}
                    onChange={(e) => setFormula(e.target.value)}
                    rows={3}
                    placeholder="e.g. (B08 - B04) / (B08 + B04)"
                    className={`w-full p-4 bg-zinc-950 border rounded-xl font-mono text-sm leading-relaxed transition-all focus:outline-none ${
                      validation.is_valid
                        ? 'border-indigo-500/60 focus:border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                        : 'border-red-500/70 focus:border-red-400 text-red-100 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                    }`}
                  />
                </div>
              </div>

              {/* Syntax Validation Status Bar */}
              <div className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
                validation.is_valid
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                  : 'bg-red-950/40 border-red-500/50 text-red-200'
              }`}>
                {validation.is_valid ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                )}

                <div className="flex-1 text-xs font-mono space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase tracking-wider">
                      {validation.is_valid ? 'Formula Validated & AST Compiled Successfully' : 'Syntax Validation Error'}
                    </span>
                    {validation.is_valid && (
                      <span className="text-slate-400">
                        AST Depth: <strong className="text-white">{validation.ast_depth}</strong> • Nodes: <strong className="text-white">{validation.node_count}</strong>
                      </span>
                    )}
                  </div>

                  {validation.is_valid ? (
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-slate-300">
                      <span>Normalized Formula:</span>
                      <code className="px-2 py-0.5 bg-zinc-900 border border-zinc-700 rounded text-cyan-300">
                        {validation.normalized_formula}
                      </code>
                      <span className="ml-2">Detected Bands:</span>
                      {validation.bands_detected.length > 0 ? (
                        validation.bands_detected.map((b) => (
                          <span key={b} className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-500/40 font-bold">
                            {b}
                          </span>
                        ))
                      ) : (
                        <span className="text-zinc-500">None (Scalar Constant)</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-red-300 font-mono">
                      {validation.error_message || 'Incomplete expression or syntax error.'}
                    </p>
                  )}
                </div>
              </div>

              {/* Token Stream & AST Hierarchy Visualizer */}
              {validation.is_valid && (
                <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase text-slate-400 flex items-center gap-1.5">
                      <Binary className="w-3.5 h-3.5 text-indigo-400" />
                      Compiled Lexical Token Stream & AST Structure:
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {tokens.length} Lexical Tokens
                    </span>
                  </div>

                  {/* Token Stream Pills */}
                  <div className="flex flex-wrap gap-1.5 p-2.5 bg-zinc-950/80 border border-zinc-800 rounded-lg">
                    {tokens.map((tok, idx) => {
                      let badgeColor = 'bg-zinc-800 text-slate-300 border-zinc-700';
                      if (tok.type === BAND_MATH_TOKEN_TYPES.IDENTIFIER) {
                        badgeColor = 'bg-amber-950/80 text-amber-300 border-amber-500/40 font-bold';
                      } else if (tok.type === BAND_MATH_TOKEN_TYPES.NUMBER) {
                        badgeColor = 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40';
                      } else if (tok.type === BAND_MATH_TOKEN_TYPES.OPERATOR) {
                        badgeColor = 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40 font-bold';
                      } else if (tok.type === BAND_MATH_TOKEN_TYPES.LPAREN || tok.type === BAND_MATH_TOKEN_TYPES.RPAREN) {
                        badgeColor = 'bg-purple-950/60 text-purple-300 border-purple-500/40';
                      }
                      return (
                        <span
                          key={idx}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono border ${badgeColor}`}
                          title={`Type: ${tok.type}`}
                        >
                          {tok.value}
                        </span>
                      );
                    })}
                  </div>

                  {/* Visual AST Node Tree */}
                  {validation.ast && (
                    <div className="p-3 bg-zinc-950/90 border border-zinc-800 rounded-lg overflow-x-auto">
                      <div className="text-[10px] font-mono text-zinc-500 uppercase mb-1.5">
                        Interactive AST Expression Hierarchy:
                      </div>
                      <ASTNodeTree node={validation.ast} />
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* TAB 2: PRESET INDEX LIBRARY */}
          {activeTab === 'presets' && (
            <div className="space-y-6">
              
              {/* Preset Search & Filter */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={presetSearch}
                    onChange={(e) => setPresetSearch(e.target.value)}
                    placeholder="Search 12 spectral presets..."
                    className="w-full pl-9 pr-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                  {['all', 'vegetation', 'water_moisture', 'burn_geology', 'minerals'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setPresetCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono capitalize transition-all ${
                        presetCategory === cat
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-zinc-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Presets Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPresets.map((preset) => {
                  const isCurrent = formula === preset.formula;
                  return (
                    <div
                      key={preset.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between transition-all hover:border-indigo-500/60 ${
                        isCurrent
                          ? 'bg-indigo-950/40 border-indigo-500/70 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                          : 'bg-zinc-900/60 border-zinc-800'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-zinc-800 text-indigo-300 border border-zinc-700">
                            {preset.id.toUpperCase()}
                          </span>
                          <span className="text-[10px] font-mono capitalize text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                            {preset.category?.replace('_', ' ')}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-white line-clamp-1">
                          {preset.name}
                        </h3>

                        <p className="text-xs text-slate-400 line-clamp-2">
                          {preset.description}
                        </p>

                        <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800/80 font-mono text-xs text-cyan-300 break-all">
                          {preset.formula}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-mono text-zinc-400">
                          <span>Bands:</span>
                          {preset.bands_required?.map((b) => (
                            <span key={b} className="px-1.5 py-0.2 bg-zinc-800 text-amber-300 rounded border border-zinc-700 font-bold">
                              {b}
                            </span>
                          ))}
                          <span className="ml-auto text-zinc-500">
                            Range: [{preset.default_rescale?.join(', ')}]
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 mt-2 border-t border-zinc-800/80 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase">
                          Colormap: <span className="text-slate-300">{preset.default_colormap}</span>
                        </span>

                        <button
                          onClick={() => handleLoadPreset(preset)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                            isCurrent
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                          }`}
                        >
                          {isCurrent ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <ArrowRight className="w-3.5 h-3.5" />
                              <span>Load Preset</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* TAB 3: SCALAR PIXEL SANDBOX */}
          {activeTab === 'sandbox' && (
            <div className="space-y-6">
              
              {/* Benchmark Landcover Quick Profiles */}
              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    Load Benchmark Landcover Reflectance Profiles:
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Populates realistic surface reflectance values (0.0 to 1.0)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {Object.values(BENCHMARK_LANDCOVER_PROFILES).map((prof) => (
                    <button
                      key={prof.id}
                      onClick={() => handleLoadLandcoverProfile(prof)}
                      className="p-2.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 text-left transition-all hover:scale-105 active:scale-95 space-y-1"
                    >
                      <div className="text-[11px] font-bold text-white line-clamp-1">{prof.name}</div>
                      <div className="text-[9px] font-mono text-indigo-300 uppercase">{prof.category}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Band Sliders */}
              <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-slate-400 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                    Interactive Band Reflectance Values (Input Variables):
                  </span>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    {validation.bands_detected.length} Active Formula Variables
                  </span>
                </div>

                {validation.bands_detected.length === 0 ? (
                  <div className="p-4 text-center text-xs font-mono text-zinc-500">
                    Formula contains no band variables. Enter band tokens like B04, B08, or NIR to enable interactive reflectance tuning.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {validation.bands_detected.map((band) => {
                      const curVal = sandboxBandValues[band] ?? 0.20;
                      return (
                        <div key={band} className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-lg space-y-2">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="font-bold text-amber-300">{band} Reflectance:</span>
                            <span className="text-white font-mono bg-zinc-900 px-2 py-0.5 rounded border border-zinc-700">
                              {curVal.toFixed(3)}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.0"
                            max="1.0"
                            step="0.01"
                            value={curVal}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              setSandboxBandValues((prev) => ({
                                ...prev,
                                [band]: v
                              }));
                            }}
                            className="w-full accent-indigo-500 cursor-pointer"
                          />
                          <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
                            <span>0.00 (Total Absorb)</span>
                            <span>0.50</span>
                            <span>1.00 (Specular)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Real-Time Computed Scalar Result Display */}
              <div className="p-6 bg-gradient-to-br from-indigo-950/40 via-zinc-950 to-zinc-900 border border-indigo-500/50 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-1.5">
                  <span className="text-xs font-mono uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                    <Gauge className="w-4 h-4 text-indigo-400" />
                    Computed Formula Scalar Value
                  </span>
                  <div className="text-3xl font-extrabold font-mono text-white tracking-wider flex items-center gap-3">
                    {sandboxEvaluation.success ? (
                      <span className={sandboxEvaluation.value >= 0 ? 'text-emerald-400' : 'text-amber-400'}>
                        {sandboxEvaluation.value.toFixed(4)}
                      </span>
                    ) : (
                      <span className="text-red-400 text-lg">Evaluation Failed</span>
                    )}
                    <span className="text-xs font-mono text-zinc-500">
                      (ε = {epsilon})
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    Single-pixel AST evaluation with denominator zero-guard clamping.
                  </p>
                </div>

                <div className="w-full md:w-80 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>Normalized Dynamic Scale</span>
                    <span>[-1.0 to +1.0]</span>
                  </div>
                  <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
                    {sandboxEvaluation.success && Number.isFinite(sandboxEvaluation.value) && (
                      <div
                        className="h-full bg-gradient-to-r from-red-500 via-yellow-400 to-emerald-500 transition-all duration-300"
                        style={{
                          width: `${Math.max(0, Math.min(100, ((sandboxEvaluation.value + 1.0) / 2.0) * 100))}%`
                        }}
                      />
                    )}
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                    <span>-1.0</span>
                    <span>0.0</span>
                    <span>+1.0</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: XYZ TILELAYER & RENDERING CONTROLS */}
          {activeTab === 'tilelayer' && (
            <div className="space-y-6">
              
              {/* Colormap Selector */}
              <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    Color Palette (Raster Colormap Shader):
                  </span>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    Applied during XYZ dynamic tile rendering
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {COLORMAP_OPTIONS.map((cm) => (
                    <button
                      key={cm.id}
                      onClick={() => setSelectedColormap(cm.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedColormap === cm.id
                          ? 'bg-indigo-950/60 border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                          : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white uppercase font-mono">{cm.id}</span>
                        {selectedColormap === cm.id && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </div>
                      <div className={`h-2.5 w-full rounded bg-gradient-to-r ${cm.gradient}`} />
                      <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">{cm.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Rescaling Bounds & Epsilon Numerical Guard */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                  <label className="block text-xs font-mono uppercase text-slate-400">
                    Rescale Minimum Value
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={rescaleMin}
                    onChange={(e) => setRescaleMin(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-zinc-500 font-mono">Values below this clamp to 0</span>
                </div>

                <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                  <label className="block text-xs font-mono uppercase text-slate-400">
                    Rescale Maximum Value
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={rescaleMax}
                    onChange={(e) => setRescaleMax(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-zinc-500 font-mono">Values above this clamp to 255</span>
                </div>

                <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                  <label className="block text-xs font-mono uppercase text-slate-400">
                    Epsilon Zero-Guard (ε)
                  </label>
                  <input
                    type="number"
                    step="1e-7"
                    value={epsilon}
                    onChange={(e) => setEpsilon(parseFloat(e.target.value) || 1e-6)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-zinc-500 font-mono">Denominator division guard</span>
                </div>
              </div>

              {/* Generated Dynamic Leaflet XYZ Tile URL Template */}
              <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-slate-400 flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-indigo-400" />
                    Dynamic XYZ Custom Tile URL Template (RFC 3986 Encoded):
                  </span>
                  <button
                    onClick={handleCopyTileUrl}
                    className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-slate-300 flex items-center gap-1.5 transition-all"
                  >
                    <Copy className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{copiedUrl ? 'Copied Template!' : 'Copy URL'}</span>
                  </button>
                </div>

                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg font-mono text-xs text-indigo-300 break-all select-all">
                  {tileUrlTemplate}
                </div>

                <div className="text-[11px] text-zinc-500 font-mono">
                  This endpoint dynamically computes the AST expression across satellite/drone raster pixels in real time and streams 256×256 RGBA tiles directly into Leaflet.
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-zinc-900/90 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Formula:</span>
            <code className="px-2 py-0.5 bg-zinc-950 border border-zinc-700 rounded text-indigo-300 font-bold max-w-xs sm:max-w-md truncate">
              {formula}
            </code>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-slate-300 rounded-xl text-xs font-mono font-bold transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleApplyToMap}
              disabled={!validation.is_valid}
              className={`w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all ${
                validation.is_valid
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 hover:scale-105 active:scale-95'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Apply Custom Math TileLayer to Map</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
