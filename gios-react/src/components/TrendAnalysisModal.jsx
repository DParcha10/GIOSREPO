import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X, TrendingUp, TrendingDown, Minus, Activity, Calendar,
  Sliders, Layers, Filter, CheckCircle2, AlertTriangle,
  RefreshCw, Copy, Check, Download, BarChart3, Info,
  Sparkles, Satellite, Compass, Eye, EyeOff
} from 'lucide-react';
import {
  fetchTrendModels,
  requestTrendAnalysis,
  evaluateTrendQuality
} from '../api/giosApi';
import {
  TrendModel,
  TREND_MODELS,
  TrendSignificanceClass,
  TREND_SIGNIFICANCE_CLASSES,
  TrendTileMetric,
  TREND_TILE_METRICS,
  TrendTargetIndex,
  TREND_TARGET_INDICES,
  TrendConfidenceRating,
  TREND_MODEL_CONFIGS,
  TREND_SIGNIFICANCE_CONFIGS,
  TREND_BENCHMARK_SCENES,
  calculateTheilSenSlope,
  calculateMannKendallStatistics,
  calculateYuePilonPrewhitening,
  classifyTrendSignificance,
  buildTrendTileUrlTemplate
} from '../config/constants';

/**
 * Colormap choices for Non-Parametric Trend Raster Tile Visualization.
 */
const TREND_COLORMAP_OPTIONS = [
  {
    id: 'rdylbu',
    label: 'RdYlBu Divergent (Standard Anomaly)',
    desc: 'Red (severe browning/degradation) to Yellow (neutral) to Blue/Green (greening)',
    gradient: 'from-rose-600 via-amber-300 to-blue-600'
  },
  {
    id: 'viridis',
    label: 'Viridis (Perceptually Uniform)',
    desc: 'Standard biophysical scale from low degradation to high productivity',
    gradient: 'from-purple-900 via-emerald-500 to-yellow-300'
  },
  {
    id: 'spectral',
    label: 'Spectral (Multi-Band Divergent)',
    desc: 'Multi-hue spectrum highlighting fine secular rate variances',
    gradient: 'from-blue-600 via-emerald-400 via-amber-300 to-rose-600'
  },
  {
    id: 'turbo',
    label: 'Turbo (Google Earth Engine)',
    desc: 'High dynamic range rainbow color scale for fine gradient details',
    gradient: 'from-blue-600 via-emerald-400 via-yellow-400 to-red-600'
  },
  {
    id: 'magma',
    label: 'Magma Radiance',
    desc: 'High contrast thermal radiation and canopy degradation',
    gradient: 'from-zinc-950 via-purple-800 via-rose-500 to-amber-200'
  },
  {
    id: 'plasma',
    label: 'Plasma Continuum',
    desc: 'Photosynthetic capacity and moisture continuum',
    gradient: 'from-blue-900 via-purple-600 via-rose-500 to-amber-300'
  }
];

/**
 * Detailed descriptions for trend tile rendering metrics.
 */
const TREND_TILE_METRIC_DETAILS = {
  [TrendTileMetric.THEIL_SEN_SLOPE]: {
    name: "Theil-Sen Median Slope (Q_med)",
    formula: "median((x_j - x_k) / (t_j - t_k)) [Δindex / year]",
    description: "Robust non-parametric rate of change per year resisting up to 29.3% cloud/shadow outliers.",
    unit: "Δindex/yr",
    recommendedColormap: "rdylbu"
  },
  [TrendTileMetric.MANN_KENDALL_ZSCORE]: {
    name: "Mann-Kendall Standardized Z_S Score",
    formula: "Z_S = (S ± 1) / sqrt(Var(S))",
    description: "Standardized normal rank statistic quantifying monotonic secular direction and significance.",
    unit: "Z-score [-4.0, +4.0]",
    recommendedColormap: "spectral"
  },
  [TrendTileMetric.TREND_SIGNIFICANCE]: {
    name: "Categorical Trend Significance",
    formula: "Significance class based on p-value and Z_S direction",
    description: "Multi-tier classification: Significant Greening, Significant Browning, Moderate, and Stable.",
    unit: "Class Tier",
    recommendedColormap: "rdylbu"
  },
  [TrendTileMetric.P_VALUE]: {
    name: "Two-Tailed Hypothesis p-Value",
    formula: "p = 2 * (1 - Phi(|Z_S|))",
    description: "Probability that observed monotonic trajectory arose by random chance alone.",
    unit: "Probability [0.0, 1.0]",
    recommendedColormap: "magma"
  },
  [TrendTileMetric.PREWHITENED_SLOPE]: {
    name: "Yue-Pilon TFPW Autocorrelation-Corrected Slope",
    formula: "Theil-Sen slope evaluated after lag-1 AR(1) pre-whitening",
    description: "Removes false-positive trend inflation caused by serial autocorrelation.",
    unit: "Δindex/yr",
    recommendedColormap: "rdylbu"
  },
  [TrendTileMetric.TRAJECTORY_VARIANCE]: {
    name: "Decadal Trajectory Variance",
    formula: "Var(residuals) around median trendline",
    description: "Quantifies inter-annual climate oscillation and seasonal amplitude noise.",
    unit: "Variance",
    recommendedColormap: "turbo"
  }
};

/**
 * Non-Parametric Trend Studio Modal (Cycle v2.5.39, Task T-296).
 *
 * Implements interactive non-parametric trend inversion & multi-decadal trajectory inspection:
 * - Multi-decadal pixel trajectory inspector with Theil-Sen median slope line
 * - 95% Confidence Interval envelope (Sen's non-parametric rank interval)
 * - Yue-Pilon Trend-Free Pre-Whitening (TFPW) AR(1) autocorrelation correction
 * - Mann-Kendall rank correlation test statistics (S, Var(S), Z_S, p-value, tau)
 * - Significance threshold toggles (p < 0.01, p < 0.05, p < 0.10, all)
 * - Direction filter (Greening, Browning, Stable, All)
 * - Dynamic Leaflet TileLayer configuration & export controls
 */
export default function TrendAnalysisModal({
  isOpen,
  onClose,
  onApply,
  onApplyTileLayer = null,
  initialSceneKey = 'SAN_LUIS_RESERVOIR_DROUGHT_DECADE_2016_2026'
}) {
  // Navigation tabs: 'trajectory' | 'statistics' | 'filter' | 'tiles' | 'methodology'
  const [activeTab, setActiveTab] = useState('trajectory');

  // Benchmark Scene Selection
  const [selectedSceneKey, setSelectedSceneKey] = useState(initialSceneKey);
  const benchmarkKeys = useMemo(() => Object.keys(TREND_BENCHMARK_SCENES || {}), []);

  const activeBenchmark = useMemo(() => {
    return (TREND_BENCHMARK_SCENES && TREND_BENCHMARK_SCENES[selectedSceneKey]) || {
      name: 'San Luis Reservoir Decadal Hydrological Trajectory (2016-2026)',
      bbox: [-121.15, 37.00, -121.02, 37.10],
      coordinates: [37.0582, -121.0744],
      targetIndex: 'ndmi',
      startYear: 2016,
      endYear: 2026,
      expectedTheilSenSlope: -0.0142,
      expectedMkZscore: -2.85,
      expectedSignificance: 'significant_browning',
      description: 'Multi-decadal Landsat/Sentinel-2 time series tracking sub-alpine reservoir storage decline, dam face exposure, and embankment pore pressure dynamics.'
    };
  }, [selectedSceneKey]);

  // Model & Index State
  const [sceneName, setSceneName] = useState(activeBenchmark.name);
  const [latitude, setLatitude] = useState(activeBenchmark.coordinates[0]);
  const [longitude, setLongitude] = useState(activeBenchmark.coordinates[1]);
  const [selectedModel, setSelectedModel] = useState(TrendModel.THEIL_SEN_MEDIAN);
  const [targetIndex, setTargetIndex] = useState(activeBenchmark.targetIndex || 'ndvi');
  const [startYear, setStartYear] = useState(activeBenchmark.startYear || 2016);
  const [endYear, setEndYear] = useState(activeBenchmark.endYear || 2026);

  // Visualization & Toggles
  const [showConfidenceEnvelope, setShowConfidenceEnvelope] = useState(true);
  const [showPrewhitenedSeries, setShowPrewhitenedSeries] = useState(true);
  const [showOlsLine, setShowOlsLine] = useState(false);
  const [showResiduals, setShowResiduals] = useState(true);
  const [hoverIndex, setHoverIndex] = useState(null);

  // Significance Filters
  const [significanceThreshold, setSignificanceThreshold] = useState('0.05'); // '0.01' | '0.05' | '0.10' | 'all'
  const [directionFilter, setDirectionFilter] = useState('all'); // 'all' | 'greening' | 'browning' | 'stable'

  // Dynamic Tile Layer Controls
  const [selectedMetric, setSelectedMetric] = useState(TrendTileMetric.THEIL_SEN_SLOPE);
  const [selectedColormap, setSelectedColormap] = useState('rdylbu');
  const [layerOpacity, setLayerOpacity] = useState(0.85);

  // Execution & SDK State
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // Synchronize inputs when benchmark scene changes
  const handleSelectScene = useCallback((key) => {
    setSelectedSceneKey(key);
    const scene = TREND_BENCHMARK_SCENES[key];
    if (scene) {
      setSceneName(scene.name);
      setLatitude(scene.coordinates[0]);
      setLongitude(scene.coordinates[1]);
      setTargetIndex(scene.targetIndex || 'ndvi');
      setStartYear(scene.startYear || 2016);
      setEndYear(scene.endYear || 2026);
      if (key === 'SAN_LUIS_RESERVOIR_DROUGHT_DECADE_2016_2026') {
        setSelectedMetric(TrendTileMetric.THEIL_SEN_SLOPE);
        setSelectedColormap('rdylbu');
      } else if (key === 'PARADISE_CALIFORNIA_POST_FIRE_RECOVERY_2018_2026') {
        setSelectedMetric(TrendTileMetric.MANN_KENDALL_ZSCORE);
        setSelectedColormap('viridis');
      } else if (key === 'LAKE_MEAD_WATER_STORAGE_TRAJECTORY_2015_2026') {
        setSelectedMetric(TrendTileMetric.THEIL_SEN_SLOPE);
        setSelectedColormap('spectral');
      } else if (key === 'CENTRAL_VALLEY_AQUIFER_SUBSIDENCE_2016_2026') {
        setSelectedMetric(TrendTileMetric.TREND_SIGNIFICANCE);
        setSelectedColormap('rdylbu');
      }
    }
  }, []);

  // Compute or simulate trajectory points
  const rawTrajectory = useMemo(() => {
    if (analysisResult && analysisResult.trajectory_points && analysisResult.trajectory_points.length > 0) {
      return analysisResult.trajectory_points;
    }

    const points = [];
    const nYears = Math.max(2, endYear - startYear + 1);
    const totalMonths = nYears * 12;

    let baseVal = 0.52;
    let expectedSlope = activeBenchmark.expectedTheilSenSlope ?? -0.012;
    if (targetIndex === 'ndvi') baseVal = 0.45;
    else if (targetIndex === 'ndmi') baseVal = 0.50;
    else if (targetIndex === 'mndwi') baseVal = 0.60;
    else if (targetIndex === 'evi') baseVal = 0.38;

    const timestamps = [];
    const values = [];

    for (let i = 0; i < totalMonths; i++) {
      const yr = startYear + Math.floor(i / 12);
      const mo = (i % 12) + 1;
      const tYears = yr + (mo - 1) / 12.0;
      const seasonal = 0.12 * Math.sin((2 * Math.PI * (mo - 1)) / 12.0);
      const secular = expectedSlope * (tYears - startYear);
      // Realistic inter-annual noise and auto-correlated perturbation
      const noise = 0.025 * Math.sin(i * 1.7) + 0.015 * Math.cos(i * 0.9);
      const val = Math.max(0.04, Math.min(0.96, baseVal + secular + seasonal + noise));

      timestamps.push(tYears);
      values.push(val);
    }

    const ts = calculateTheilSenSlope(timestamps, values);
    const yuePilon = calculateYuePilonPrewhitening(timestamps, values);

    for (let i = 0; i < totalMonths; i++) {
      const yr = startYear + Math.floor(i / 12);
      const mo = (i % 12) + 1;
      const fitted = Number((ts.intercept + ts.slopePerYear * timestamps[i]).toFixed(4));
      const dateStr = `${yr}-${mo < 10 ? '0' : ''}${mo}-15`;
      points.push({
        date: dateStr,
        timestamp_years: Number(timestamps[i].toFixed(3)),
        value: Number(values[i].toFixed(4)),
        prewhitened_value: Number(yuePilon.prewhitenedValues[i].toFixed(4)),
        fitted_value: fitted,
        residual: Number((values[i] - fitted).toFixed(4))
      });
    }

    return points;
  }, [analysisResult, startYear, endYear, activeBenchmark, targetIndex]);

  // Execute trend calculations
  const trendStats = useMemo(() => {
    if (!rawTrajectory || rawTrajectory.length < 3) {
      return {
        theilSen: { slopePerYear: 0, intercept: 0, slopeCiLower: 0, slopeCiUpper: 0, pairwiseCount: 0, breakdownPoint: 0.293 },
        mannKendall: { sStatistic: 0, varianceS: 0, zScore: 0, pValue: 1.0, kendallTau: 0, isSignificant95: false, isSignificant99: false },
        yuePilon: { lag1Autocorrelation: 0, isAutocorrelated: false, autocorrelationCriticalValue: 0, prewhitenedSlope: 0, prewhitenedZScore: 0, prewhitenedPValue: 1.0 },
        ols: { slope: 0, intercept: 0, rSquared: 0 },
        significanceClass: TrendSignificanceClass.STABLE_NO_TREND,
        annualPercent: 0
      };
    }

    const timestamps = rawTrajectory.map((p) => p.timestamp_years);
    const values = rawTrajectory.map((p) => p.value);

    const ts = calculateTheilSenSlope(timestamps, values);
    const mk = calculateMannKendallStatistics(values);
    const yp = calculateYuePilonPrewhitening(timestamps, values);
    const sigClass = classifyTrendSignificance(
      selectedModel === TrendModel.YUE_PILON_PREWHITENED ? yp.prewhitenedZScore : mk.zScore,
      selectedModel === TrendModel.YUE_PILON_PREWHITENED ? yp.prewhitenedPValue : mk.pValue,
      selectedModel === TrendModel.YUE_PILON_PREWHITENED ? yp.prewhitenedSlope : ts.slopePerYear
    );

    // OLS baseline calculation
    const n = values.length;
    const meanT = timestamps.reduce((a, b) => a + b, 0) / n;
    const meanV = values.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (timestamps[i] - meanT) * (values[i] - meanV);
      den += (timestamps[i] - meanT) * (timestamps[i] - meanT);
    }
    const olsSlope = den !== 0 ? num / den : 0;
    const olsIntercept = meanV - olsSlope * meanT;

    let ssTot = 0;
    let ssRes = 0;
    for (let i = 0; i < n; i++) {
      const fit = olsIntercept + olsSlope * timestamps[i];
      ssTot += (values[i] - meanV) ** 2;
      ssRes += (values[i] - fit) ** 2;
    }
    const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

    const baseVal = values[0] || 0.5;
    const effectiveSlope = selectedModel === TrendModel.YUE_PILON_PREWHITENED ? yp.prewhitenedSlope : ts.slopePerYear;
    const annualPct = baseVal !== 0 ? (effectiveSlope / baseVal) * 100 : 0;

    return {
      theilSen: ts,
      mannKendall: mk,
      yuePilon: yp,
      ols: { slope: olsSlope, intercept: olsIntercept, rSquared: r2 },
      significanceClass: sigClass,
      annualPercent: annualPct
    };
  }, [rawTrajectory, selectedModel]);

  // Execute remote API analysis request
  const handleRunAnalysis = useCallback(async () => {
    setLoading(true);
    try {
      const reqPayload = {
        aoi_name: sceneName,
        coordinates: [latitude, longitude],
        target_index: targetIndex,
        model: selectedModel,
        start_year: startYear,
        end_year: endYear
      };

      const result = await requestTrendAnalysis(reqPayload);
      if (result) {
        setAnalysisResult(result);
      }
    } catch {
      // Demo adapter handles transparent fallback
    } finally {
      setLoading(false);
    }
  }, [sceneName, latitude, longitude, targetIndex, selectedModel, startYear, endYear]);

  // Initial fetch on mount
  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      fetchTrendModels()
        .then(() => {
          if (isMounted) {
            // Models active
          }
        })
        .catch(() => {});

      evaluateTrendQuality({
        model: selectedModel,
        target_index: targetIndex
      }).catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedModel, targetIndex]);

  // Filtered trajectory points for plotting
  const filteredTrajectory = useMemo(() => {
    const isPFiltered = (pVal) => {
      if (significanceThreshold === '0.01') return pVal < 0.01;
      if (significanceThreshold === '0.05') return pVal < 0.05;
      if (significanceThreshold === '0.10') return pVal < 0.10;
      return true;
    };

    const isDirFiltered = (zScore) => {
      if (directionFilter === 'greening') return zScore > 0;
      if (directionFilter === 'browning') return zScore < 0;
      if (directionFilter === 'stable') return Math.abs(zScore) <= 1.645;
      return true;
    };

    const currentP = selectedModel === TrendModel.YUE_PILON_PREWHITENED ? trendStats.yuePilon.prewhitenedPValue : trendStats.mannKendall.pValue;
    const currentZ = selectedModel === TrendModel.YUE_PILON_PREWHITENED ? trendStats.yuePilon.prewhitenedZScore : trendStats.mannKendall.zScore;

    if (!isPFiltered(currentP) || !isDirFiltered(currentZ)) {
      return [];
    }

    return rawTrajectory;
  }, [rawTrajectory, significanceThreshold, directionFilter, trendStats, selectedModel]);

  // Computed Tile URL template
  const tileUrlTemplate = useMemo(() => {
    return buildTrendTileUrlTemplate({
      model: selectedModel,
      metric: selectedMetric,
      colormap: selectedColormap,
      index: targetIndex
    });
  }, [selectedModel, selectedMetric, selectedColormap, targetIndex]);

  // Handle Apply Tile Layer
  const handleApplyLayer = useCallback(() => {
    const payload = {
      urlTemplate: tileUrlTemplate,
      model: selectedModel,
      metric: selectedMetric,
      colormap: selectedColormap,
      opacity: layerOpacity,
      targetIndex,
      sceneName,
      slope: selectedModel === TrendModel.YUE_PILON_PREWHITENED ? trendStats.yuePilon.prewhitenedSlope : trendStats.theilSen.slopePerYear,
      zScore: selectedModel === TrendModel.YUE_PILON_PREWHITENED ? trendStats.yuePilon.prewhitenedZScore : trendStats.mannKendall.zScore,
      pValue: selectedModel === TrendModel.YUE_PILON_PREWHITENED ? trendStats.yuePilon.prewhitenedPValue : trendStats.mannKendall.pValue,
      significanceClass: trendStats.significanceClass,
      summary: {
        model: selectedModel,
        metric: selectedMetric,
        theil_sen_slope: trendStats.theilSen.slopePerYear,
        mann_kendall_zscore: trendStats.mannKendall.zScore,
        p_value: trendStats.mannKendall.pValue,
        significance_class: trendStats.significanceClass,
        annual_change_percent: trendStats.annualPercent
      }
    };

    if (onApplyTileLayer) {
      onApplyTileLayer(payload);
    } else if (onApply) {
      onApply(payload);
    }

    onClose();
  }, [tileUrlTemplate, selectedModel, selectedMetric, selectedColormap, layerOpacity, targetIndex, sceneName, trendStats, onApplyTileLayer, onApply, onClose]);

  // Copy helpers
  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(tileUrlTemplate);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  }, [tileUrlTemplate]);

  const handleCopyJson = useCallback(() => {
    const jsonStr = JSON.stringify({
      scene: sceneName,
      target_index: targetIndex,
      model: selectedModel,
      theil_sen: trendStats.theilSen,
      mann_kendall: trendStats.mannKendall,
      yue_pilon: trendStats.yuePilon,
      trajectory_points: rawTrajectory
    }, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  }, [sceneName, targetIndex, selectedModel, trendStats, rawTrajectory]);

  // Export CSV
  const handleDownloadCsv = useCallback(() => {
    const headers = ['Date', 'TimestampYears', 'ObservedValue', 'PrewhitenedValue', 'TheilSenFitted', 'Residual'];
    const rows = rawTrajectory.map((p) => [
      p.date,
      p.timestamp_years,
      p.value,
      p.prewhitened_value,
      p.fitted_value,
      p.residual
    ].join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${sceneName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_trend_trajectory.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [sceneName, rawTrajectory]);

  // SVG Chart Dimensions
  const svgWidth = 840;
  const svgHeight = 280;
  const margin = { top: 20, right: 30, bottom: 40, left: 60 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  // Scales & SVG Mapping
  const chartScales = useMemo(() => {
    if (!rawTrajectory || rawTrajectory.length === 0) {
      return { tMin: 2016, tMax: 2026, vMin: 0, vMax: 1, toX: () => 0, toY: () => 0 };
    }

    const tMin = startYear;
    const tMax = endYear + 0.001;

    let vMin = Math.min(...rawTrajectory.map((p) => Math.min(p.value, p.fitted_value)));
    let vMax = Math.max(...rawTrajectory.map((p) => Math.max(p.value, p.fitted_value)));
    const pad = (vMax - vMin) * 0.15 || 0.1;
    vMin = Math.max(0, vMin - pad);
    vMax = Math.min(1.0, vMax + pad);

    const toX = (t) => margin.left + ((t - tMin) / (tMax - tMin)) * plotWidth;
    const toY = (v) => margin.top + plotHeight - ((v - vMin) / (vMax - vMin)) * plotHeight;

    return { tMin, tMax, vMin, vMax, toX, toY };
  }, [rawTrajectory, startYear, endYear, plotWidth, plotHeight, margin.left, margin.top]);

  // SVG Trend Lines and Envelope Coordinates
  const chartGeometry = useMemo(() => {
    const { tMin, tMax, toX, toY } = chartScales;
    const ts = trendStats.theilSen;
    const ols = trendStats.ols;

    // Theil-Sen Median Line
    const tsY1 = ts.intercept + ts.slopePerYear * tMin;
    const tsY2 = ts.intercept + ts.slopePerYear * tMax;

    // 95% Confidence Interval Upper/Lower Lines
    const ciLowY1 = ts.intercept + ts.slopeCiLower * tMin;
    const ciLowY2 = ts.intercept + ts.slopeCiLower * tMax;
    const ciHighY1 = ts.intercept + ts.slopeCiUpper * tMin;
    const ciHighY2 = ts.intercept + ts.slopeCiUpper * tMax;

    // OLS Line
    const olsY1 = ols.intercept + ols.slope * tMin;
    const olsY2 = ols.intercept + ols.slope * tMax;

    // Shaded Envelope Polygon Points
    const envelopePoints = [
      `${toX(tMin)},${toY(ciLowY1)}`,
      `${toX(tMax)},${toY(ciLowY2)}`,
      `${toX(tMax)},${toY(ciHighY2)}`,
      `${toX(tMin)},${toY(ciHighY1)}`
    ].join(' ');

    return {
      tsLine: { x1: toX(tMin), y1: toY(tsY1), x2: toX(tMax), y2: toY(tsY2) },
      olsLine: { x1: toX(tMin), y1: toY(olsY1), x2: toX(tMax), y2: toY(olsY2) },
      envelopePoints
    };
  }, [chartScales, trendStats]);

  // Grid tick marks
  const xTicks = useMemo(() => {
    const ticks = [];
    for (let yr = startYear; yr <= endYear; yr += 1) {
      ticks.push(yr);
    }
    return ticks;
  }, [startYear, endYear]);

  const yTicks = useMemo(() => {
    const { vMin, vMax } = chartScales;
    const count = 5;
    const ticks = [];
    for (let i = 0; i <= count; i++) {
      ticks.push(vMin + (i / count) * (vMax - vMin));
    }
    return ticks;
  }, [chartScales]);

  const activeSigConfig = TREND_SIGNIFICANCE_CONFIGS[trendStats.significanceClass] || TREND_SIGNIFICANCE_CONFIGS[TrendSignificanceClass.STABLE_NO_TREND];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-zinc-950 border border-emerald-500/40 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.2)] overflow-hidden text-slate-200 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-zinc-900/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <TrendingUp className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">Non-Parametric Trend Studio</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Cycle v2.5.39
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {targetIndex.toUpperCase()}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${activeSigConfig.badgeClass}`}>
                  {activeSigConfig.label}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Theil-Sen Robust Median Slope • Mann-Kendall Rank Correlation • Yue-Pilon Pre-Whitening (TFPW)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunAnalysis}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all disabled:opacity-50"
              title="Re-run Non-Parametric Trend Inversion"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Inverting...' : 'Re-Run Inversion'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Benchmark Scenes Selector Bar */}
        <div className="px-6 py-2.5 bg-zinc-900/40 border-b border-gray-800/80 flex items-center justify-between text-xs font-mono flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 uppercase font-bold text-[11px]">Benchmark Target:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {benchmarkKeys.map((key) => {
                const sc = TREND_BENCHMARK_SCENES[key];
                const isSelected = selectedSceneKey === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleSelectScene(key)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all truncate max-w-[210px] border ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                        : 'bg-zinc-800/60 text-zinc-400 border-zinc-700/60 hover:text-white hover:bg-zinc-800'
                    }`}
                    title={sc.description}
                  >
                    {sc.name.split(' ')[0]} {sc.name.split(' ')[1]} ({sc.startYear}-{sc.endYear})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 text-zinc-400 text-[11px]">
            <span>AOI: <strong className="text-white font-mono">{latitude.toFixed(4)}°N, {longitude.toFixed(4)}°W</strong></span>
            <span>Period: <strong className="text-emerald-400 font-mono">{startYear} – {endYear} ({endYear - startYear + 1} yrs)</strong></span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-800 bg-zinc-950/60 px-6 text-xs font-mono">
          {[
            { id: 'trajectory', label: 'Decadal Trajectory', icon: Activity },
            { id: 'statistics', label: 'Hypothesis Testing & Rigor', icon: BarChart3 },
            { id: 'filter', label: 'Significance Filters', icon: Filter },
            { id: 'tiles', label: 'Dynamic TrendLayer', icon: Layers },
            { id: 'methodology', label: 'Scientific Models', icon: Info }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-4 font-bold border-b-2 transition-all ${
                  isActive
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: TRAJECTORY & CONFIDENCE ENVELOPE */}
          {activeTab === 'trajectory' && (
            <div className="space-y-6">
              {/* Interactive SVG Trajectory Plot */}
              <div className="glass-panel p-5 rounded-xl border border-gray-800 bg-zinc-900/50 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Satellite className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white tracking-wide">
                      Multi-Decadal Satellite Pixel Trajectory ({sceneName})
                    </h3>
                  </div>

                  {/* Chart Overlay Toggles */}
                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <button
                      onClick={() => setShowConfidenceEnvelope(!showConfidenceEnvelope)}
                      className={`px-2 py-1 rounded border transition-all flex items-center gap-1 ${
                        showConfidenceEnvelope
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-zinc-800/80 text-zinc-400 border-zinc-700'
                      }`}
                      title="Toggle 95% Sen's non-parametric confidence interval envelope"
                    >
                      {showConfidenceEnvelope ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>95% CI Envelope</span>
                    </button>

                    <button
                      onClick={() => setShowPrewhitenedSeries(!showPrewhitenedSeries)}
                      className={`px-2 py-1 rounded border transition-all flex items-center gap-1 ${
                        showPrewhitenedSeries
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          : 'bg-zinc-800/80 text-zinc-400 border-zinc-700'
                      }`}
                      title="Toggle Yue-Pilon Trend-Free Pre-Whitened (TFPW) series overlay"
                    >
                      {showPrewhitenedSeries ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>Yue-Pilon TFPW</span>
                    </button>

                    <button
                      onClick={() => setShowOlsLine(!showOlsLine)}
                      className={`px-2 py-1 rounded border transition-all flex items-center gap-1 ${
                        showOlsLine
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                          : 'bg-zinc-800/80 text-zinc-400 border-zinc-700'
                      }`}
                      title="Toggle Parametric OLS comparison baseline"
                    >
                      {showOlsLine ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>OLS Baseline</span>
                    </button>

                    <button
                      onClick={() => setShowResiduals(!showResiduals)}
                      className={`px-2 py-1 rounded border transition-all flex items-center gap-1 ${
                        showResiduals
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-zinc-800/80 text-zinc-400 border-zinc-700'
                      }`}
                    >
                      <BarChart3 className="w-3 h-3" />
                      <span>Residuals</span>
                    </button>
                  </div>
                </div>

                {/* SVG Visualizer */}
                <div className="relative bg-zinc-950/80 rounded-xl p-3 border border-gray-800/90 overflow-hidden">
                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    className="w-full h-auto select-none font-mono text-[10px]"
                  >
                    <defs>
                      <linearGradient id="envelopeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                        <stop offset="50%" stopColor="#10b981" stopOpacity="0.10" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.25" />
                      </linearGradient>
                    </defs>

                    {/* Gridlines */}
                    {xTicks.map((yr) => {
                      const x = chartScales.toX(yr);
                      return (
                        <g key={`xtick-${yr}`}>
                          <line
                            x1={x}
                            y1={margin.top}
                            x2={x}
                            y2={margin.top + plotHeight}
                            stroke="#27272a"
                            strokeDasharray="2,2"
                          />
                          <text
                            x={x}
                            y={margin.top + plotHeight + 16}
                            fill="#71717a"
                            textAnchor="middle"
                            fontSize="10"
                          >
                            {yr}
                          </text>
                        </g>
                      );
                    })}

                    {yTicks.map((val) => {
                      const y = chartScales.toY(val);
                      return (
                        <g key={`ytick-${val}`}>
                          <line
                            x1={margin.left}
                            y1={y}
                            x2={margin.left + plotWidth}
                            y2={y}
                            stroke="#27272a"
                            strokeDasharray="2,2"
                          />
                          <text
                            x={margin.left - 8}
                            y={y + 3}
                            fill="#71717a"
                            textAnchor="end"
                            fontSize="10"
                          >
                            {val.toFixed(2)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Axis Labels */}
                    <text
                      x={margin.left + plotWidth / 2}
                      y={svgHeight - 6}
                      fill="#a1a1aa"
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="bold"
                    >
                      Observation Timeline (Decadal Years)
                    </text>
                    <text
                      x={-(margin.top + plotHeight / 2)}
                      y={16}
                      fill="#a1a1aa"
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="bold"
                      transform="rotate(-90)"
                    >
                      {targetIndex.toUpperCase()} Surface Index
                    </text>

                    {/* 95% Confidence Envelope */}
                    {showConfidenceEnvelope && filteredTrajectory.length > 0 && (
                      <polygon
                        points={chartGeometry.envelopePoints}
                        fill="url(#envelopeGrad)"
                        stroke="#10b981"
                        strokeWidth="0.5"
                        strokeDasharray="3,3"
                      />
                    )}

                    {/* OLS Line (if enabled) */}
                    {showOlsLine && filteredTrajectory.length > 0 && (
                      <line
                        x1={chartGeometry.olsLine.x1}
                        y1={chartGeometry.olsLine.y1}
                        x2={chartGeometry.olsLine.x2}
                        y2={chartGeometry.olsLine.y2}
                        stroke="#a855f7"
                        strokeWidth="1.8"
                        strokeDasharray="4,4"
                      />
                    )}

                    {/* Theil-Sen Median Regression Trendline */}
                    {filteredTrajectory.length > 0 && (
                      <line
                        x1={chartGeometry.tsLine.x1}
                        y1={chartGeometry.tsLine.y1}
                        x2={chartGeometry.tsLine.x2}
                        y2={chartGeometry.tsLine.y2}
                        stroke="#10b981"
                        strokeWidth="2.6"
                      />
                    )}

                    {/* Pre-whitened Series Line (if enabled) */}
                    {showPrewhitenedSeries && filteredTrajectory.length > 0 && (
                      <path
                        d={filteredTrajectory.map((p, idx) => {
                          const x = chartScales.toX(p.timestamp_years);
                          const y = chartScales.toY(p.prewhitened_value);
                          return `${idx === 0 ? 'M' : 'L'}${x},${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="1.2"
                        strokeDasharray="2,2"
                      />
                    )}

                    {/* Observation Points */}
                    {filteredTrajectory.map((p, idx) => {
                      const x = chartScales.toX(p.timestamp_years);
                      const y = chartScales.toY(p.value);
                      const isHovered = hoverIndex === idx;
                      return (
                        <circle
                          key={`pt-${idx}`}
                          cx={x}
                          cy={y}
                          r={isHovered ? 5.5 : 2.5}
                          fill={isHovered ? '#34d399' : '#38bdf8'}
                          stroke={isHovered ? '#ffffff' : '#0284c7'}
                          strokeWidth={isHovered ? 2 : 1}
                          className="cursor-pointer transition-all"
                          onMouseEnter={() => setHoverIndex(idx)}
                          onMouseLeave={() => setHoverIndex(null)}
                        />
                      );
                    })}

                    {/* Interactive Hover Probe Guideline */}
                    {hoverIndex !== null && filteredTrajectory[hoverIndex] && (
                      <line
                        x1={chartScales.toX(filteredTrajectory[hoverIndex].timestamp_years)}
                        y1={margin.top}
                        x2={chartScales.toX(filteredTrajectory[hoverIndex].timestamp_years)}
                        y2={margin.top + plotHeight}
                        stroke="#34d399"
                        strokeWidth="1"
                        strokeDasharray="3,3"
                      />
                    )}
                  </svg>

                  {/* Hover Inspection Floating HUD Card */}
                  {hoverIndex !== null && filteredTrajectory[hoverIndex] && (
                    <div className="absolute top-4 right-4 bg-zinc-950/95 border border-emerald-500/60 p-3 rounded-xl shadow-2xl font-mono text-[11px] space-y-1 w-64 backdrop-blur-md">
                      <div className="flex items-center justify-between border-b border-gray-800 pb-1">
                        <span className="text-zinc-400 font-bold">Observation Probe:</span>
                        <span className="text-emerald-400 font-bold">{filteredTrajectory[hoverIndex].date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Observed {targetIndex.toUpperCase()}:</span>
                        <span className="text-white font-bold">{filteredTrajectory[hoverIndex].value.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Theil-Sen Fitted:</span>
                        <span className="text-emerald-400 font-bold">{filteredTrajectory[hoverIndex].fitted_value.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Yue-Pilon TFPW:</span>
                        <span className="text-cyan-400 font-bold">{filteredTrajectory[hoverIndex].prewhitened_value.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Secular Residual:</span>
                        <span className={`font-bold ${filteredTrajectory[hoverIndex].residual >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                          {filteredTrajectory[hoverIndex].residual >= 0 ? '+' : ''}{filteredTrajectory[hoverIndex].residual.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sub-Panel: Residuals Bar Chart */}
                {showResiduals && filteredTrajectory.length > 0 && (
                  <div className="p-3 bg-zinc-950/60 rounded-xl border border-gray-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-400 font-bold">Decadal Residuals (Observed - Theil-Sen Fitted)</span>
                      <span className="text-zinc-500 text-[10px]">Zero-Mean Invariant E[e] ≈ 0.000</span>
                    </div>
                    <div className="h-14 flex items-center gap-[2px] w-full px-1 overflow-hidden">
                      {filteredTrajectory.map((p, idx) => {
                        const h = Math.min(24, Math.abs(p.residual) * 200);
                        const isPos = p.residual >= 0;
                        return (
                          <div
                            key={`res-${idx}`}
                            className="flex-1 flex flex-col justify-center items-center h-full group relative"
                          >
                            <div
                              style={{ height: `${Math.max(2, h)}px` }}
                              className={`w-full rounded-sm transition-all ${
                                isPos ? 'bg-cyan-500/70 group-hover:bg-cyan-400' : 'bg-rose-500/70 group-hover:bg-rose-400'
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Trajectory KPI Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                <div className="glass-panel p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/10 space-y-1">
                  <div className="text-zinc-400 font-bold text-[10px] uppercase">Theil-Sen Median Slope (Q_med)</div>
                  <div className="text-xl font-extrabold text-emerald-400">
                    {trendStats.theilSen.slopePerYear > 0 ? '+' : ''}{trendStats.theilSen.slopePerYear.toFixed(4)}
                    <span className="text-xs font-normal text-zinc-400 ml-1">/yr</span>
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    95% CI: [{trendStats.theilSen.slopeCiLower.toFixed(4)}, {trendStats.theilSen.slopeCiUpper.toFixed(4)}]
                  </div>
                </div>

                <div className="glass-panel p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/10 space-y-1">
                  <div className="text-zinc-400 font-bold text-[10px] uppercase">Mann-Kendall Z_S Score</div>
                  <div className="text-xl font-extrabold text-cyan-400">
                    {trendStats.mannKendall.zScore > 0 ? '+' : ''}{trendStats.mannKendall.zScore.toFixed(3)}
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    p-value: <strong className="text-white">{trendStats.mannKendall.pValue.toFixed(5)}</strong> ({trendStats.mannKendall.isSignificant95 ? 'p < 0.05' : 'p ≥ 0.05'})
                  </div>
                </div>

                <div className="glass-panel p-4 rounded-xl border border-amber-500/30 bg-amber-950/10 space-y-1">
                  <div className="text-zinc-400 font-bold text-[10px] uppercase">Yue-Pilon TFPW Lag-1 r1</div>
                  <div className="text-xl font-extrabold text-amber-400">
                    {trendStats.yuePilon.lag1Autocorrelation > 0 ? '+' : ''}{trendStats.yuePilon.lag1Autocorrelation.toFixed(3)}
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    {trendStats.yuePilon.isAutocorrelated ? (
                      <span className="text-amber-300 font-bold">Autocorrelated (|r1| &gt; {trendStats.yuePilon.autocorrelationCriticalValue.toFixed(2)})</span>
                    ) : (
                      <span className="text-emerald-300 font-bold">Serially Independent (White Noise)</span>
                    )}
                  </div>
                </div>

                <div className="glass-panel p-4 rounded-xl border border-purple-500/30 bg-purple-950/10 space-y-1">
                  <div className="text-zinc-400 font-bold text-[10px] uppercase">Annual Secular Rate</div>
                  <div className="text-xl font-extrabold text-purple-400">
                    {trendStats.annualPercent > 0 ? '+' : ''}{trendStats.annualPercent.toFixed(2)}%
                    <span className="text-xs font-normal text-zinc-400 ml-1">/yr</span>
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    Relative to Decadal Base: {rawTrajectory[0]?.value.toFixed(2) || '0.50'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HYPOTHESIS TESTING & STATISTICAL RIGOR */}
          {activeTab === 'statistics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Theil-Sen Robust Estimator Card */}
                <div className="glass-panel p-5 rounded-xl border border-emerald-500/30 bg-zinc-900/40 space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-sm font-bold text-white font-mono">Theil-Sen Robust Median Estimator</h4>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">Theil (1950); Sen (1968)</span>
                  </div>

                  <div className="space-y-2.5 text-xs font-mono">
                    <div className="flex justify-between py-1 border-b border-gray-800/60">
                      <span className="text-zinc-400">Robust Median Slope (Q_med):</span>
                      <strong className="text-emerald-400">{trendStats.theilSen.slopePerYear.toFixed(6)} / year</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-800/60">
                      <span className="text-zinc-400">Median Intercept (b):</span>
                      <strong className="text-white">{trendStats.theilSen.intercept.toFixed(6)}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-800/60">
                      <span className="text-zinc-400">95% Confidence Interval (Gilbert 1987):</span>
                      <strong className="text-zinc-300">[{trendStats.theilSen.slopeCiLower.toFixed(4)}, {trendStats.theilSen.slopeCiUpper.toFixed(4)}]</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-800/60">
                      <span className="text-zinc-400">Combinatorial Pairwise Slopes N(N-1)/2:</span>
                      <strong className="text-cyan-400">{trendStats.theilSen.pairwiseCount.toLocaleString()} pairs</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-800/60">
                      <span className="text-zinc-400">Outlier Breakdown Point:</span>
                      <strong className="text-purple-400 font-bold">29.3% (Gross Artifact Immunity)</strong>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-zinc-400">Monotonicity Invariance:</span>
                      <strong className="text-emerald-400">Strictly Preserved</strong>
                    </div>
                  </div>
                </div>

                {/* Mann-Kendall Hypothesis Test Card */}
                <div className="glass-panel p-5 rounded-xl border border-cyan-500/30 bg-zinc-900/40 space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-cyan-400" />
                      <h4 className="text-sm font-bold text-white font-mono">Mann-Kendall Rank Correlation Test</h4>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400 font-bold">Mann (1945); Kendall (1975)</span>
                  </div>

                  <div className="space-y-2.5 text-xs font-mono">
                    <div className="flex justify-between py-1 border-b border-gray-800/60">
                      <span className="text-zinc-400">Rank Sign Sum Statistic (S):</span>
                      <strong className="text-cyan-400">{trendStats.mannKendall.sStatistic.toFixed(1)}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-800/60">
                      <span className="text-zinc-400">Tied-Rank Variance Var(S):</span>
                      <strong className="text-zinc-300">{trendStats.mannKendall.varianceS.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-800/60">
                      <span className="text-zinc-400">Standardized Normal Score (Z_S):</span>
                      <strong className={`font-bold ${trendStats.mannKendall.zScore > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {trendStats.mannKendall.zScore.toFixed(4)}
                      </strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-800/60">
                      <span className="text-zinc-400">Two-Tailed p-value:</span>
                      <strong className={`font-bold ${trendStats.mannKendall.pValue < 0.05 ? 'text-emerald-300' : 'text-amber-400'}`}>
                        {trendStats.mannKendall.pValue.toFixed(6)}
                      </strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-800/60">
                      <span className="text-zinc-400">Kendall's Rank Correlation (tau):</span>
                      <strong className="text-white">{trendStats.mannKendall.kendallTau.toFixed(4)}</strong>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-zinc-400">Statistical Significance (alpha = 0.05):</span>
                      <strong className={trendStats.mannKendall.isSignificant95 ? 'text-emerald-400' : 'text-zinc-400'}>
                        {trendStats.mannKendall.isSignificant95 ? 'SIGNIFICANT (Reject H0)' : 'NOT SIGNIFICANT (Fail to Reject)'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Yue-Pilon Trend-Free Pre-Whitening (TFPW) */}
                <div className="glass-panel p-5 rounded-xl border border-amber-500/30 bg-zinc-900/40 space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-amber-400" />
                      <h4 className="text-sm font-bold text-white font-mono">Yue-Pilon Trend-Free Pre-Whitening</h4>
                    </div>
                    <span className="text-[10px] font-mono text-amber-400 font-bold">Yue et al. (2002)</span>
                  </div>

                  <div className="space-y-2.5 text-xs font-mono">
                    <div className="flex justify-between py-1 border-b border-gray-800/60">
                      <span className="text-zinc-400">Lag-1 Autocorrelation Coefficient (r1):</span>
                      <strong className="text-amber-400">{trendStats.yuePilon.lag1Autocorrelation.toFixed(4)}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-800/60">
                      <span className="text-zinc-400">95% Critical Upper/Lower Limits:</span>
                      <strong className="text-zinc-300">±{trendStats.yuePilon.autocorrelationCriticalValue.toFixed(4)}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-800/60">
                      <span className="text-zinc-400">AR(1) Serial Correlation Status:</span>
                      <strong className={trendStats.yuePilon.isAutocorrelated ? 'text-amber-400' : 'text-emerald-400'}>
                        {trendStats.yuePilon.isAutocorrelated ? 'AUTOCORRELATION DETECTED' : 'CLEAN / NO SERIAL CORRELATION'}
                      </strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-800/60">
                      <span className="text-zinc-400">Pre-Whitened Slope (Q_TFPW):</span>
                      <strong className="text-white">{trendStats.yuePilon.prewhitenedSlope.toFixed(6)} / yr</strong>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-zinc-400">Pre-Whitened Z_S & p-value:</span>
                      <strong className="text-cyan-300">
                        Z = {trendStats.yuePilon.prewhitenedZScore.toFixed(3)}, p = {trendStats.yuePilon.prewhitenedPValue.toFixed(5)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Parametric OLS Comparison Benchmark */}
                <div className="glass-panel p-5 rounded-xl border border-purple-500/30 bg-zinc-900/40 space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-purple-400" />
                      <h4 className="text-sm font-bold text-white font-mono">OLS Parametric Comparison (Benchmark)</h4>
                    </div>
                    <span className="text-[10px] font-mono text-purple-400 font-bold">Gauss-Markov Baseline</span>
                  </div>

                  <div className="space-y-2.5 text-xs font-mono">
                    <div className="flex justify-between py-1 border-b border-gray-800/60">
                      <span className="text-zinc-400">OLS Linear Slope (beta_1):</span>
                      <strong className="text-purple-400">{trendStats.ols.slope.toFixed(6)} / yr</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-800/60">
                      <span className="text-zinc-400">OLS Intercept (beta_0):</span>
                      <strong className="text-zinc-300">{trendStats.ols.intercept.toFixed(6)}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-800/60">
                      <span className="text-zinc-400">Coefficient of Determination (R²):</span>
                      <strong className="text-white">{trendStats.ols.rSquared.toFixed(4)}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-800/60">
                      <span className="text-zinc-400">Gross Outlier Breakdown Point:</span>
                      <strong className="text-rose-400 font-bold">0.0% (Vulnerable to 1 cloud leak)</strong>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-zinc-400">Scientific Recommendation:</span>
                      <span className="text-rose-300 font-bold">Rejected for Operational Remote Sensing</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: SIGNIFICANCE & CONFIDENCE FILTERS */}
          {activeTab === 'filter' && (
            <div className="space-y-6">
              <div className="glass-panel p-5 rounded-xl border border-gray-800 bg-zinc-900/40 space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
                  <Filter className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-bold text-white font-mono">Statistical Significance Threshold Filter</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
                  {[
                    { id: '0.01', label: 'Strict 99% CI (p < 0.01)', desc: '|Z_S| > 2.576. Eliminates false-positives; robust against sensor drift.' },
                    { id: '0.05', label: 'Standard 95% CI (p < 0.05)', desc: '|Z_S| > 1.960. Standard USGS / NASA remote sensing threshold.' },
                    { id: '0.10', label: 'Exploratory 90% CI (p < 0.10)', desc: '|Z_S| > 1.645. Early warning tier for emerging vegetation stress.' },
                    { id: 'all', label: 'Unfiltered (All Trajectories)', desc: 'Displays full continuous slope spectrum without null hypothesis rejection.' }
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      onClick={() => setSignificanceThreshold(lvl.id)}
                      className={`p-3 rounded-xl border text-left transition-all space-y-1.5 ${
                        significanceThreshold === lvl.id
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-lg'
                          : 'bg-zinc-800/40 text-zinc-400 border-zinc-700/60 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      <div className="font-bold">{lvl.label}</div>
                      <div className="text-[10px] text-zinc-500">{lvl.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Direction Filter */}
              <div className="glass-panel p-5 rounded-xl border border-gray-800 bg-zinc-900/40 space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-sm font-bold text-white font-mono">Secular Trajectory Direction Filter</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
                  {[
                    { id: 'all', label: 'All Directions', icon: Activity, color: 'text-white' },
                    { id: 'greening', label: 'Greening Only (Z > 0)', icon: TrendingUp, color: 'text-emerald-400' },
                    { id: 'browning', label: 'Browning Only (Z < 0)', icon: TrendingDown, color: 'text-rose-400' },
                    { id: 'stable', label: 'Stable Only (|Z| ≤ 1.645)', icon: Minus, color: 'text-slate-400' }
                  ].map((dir) => {
                    const Icon = dir.icon;
                    return (
                      <button
                        key={dir.id}
                        onClick={() => setDirectionFilter(dir.id)}
                        className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                          directionFilter === dir.id
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-lg'
                            : 'bg-zinc-800/40 text-zinc-400 border-zinc-700/60 hover:text-white hover:bg-zinc-800'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${dir.color}`} />
                        <div>
                          <div className="font-bold">{dir.label}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Model Inversion Selector */}
              <div className="glass-panel p-5 rounded-xl border border-gray-800 bg-zinc-900/40 space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  <h4 className="text-sm font-bold text-white font-mono">Primary Inversion Model</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                  {[
                    { id: TrendModel.THEIL_SEN_MEDIAN, name: 'Theil-Sen Robust Median', desc: 'Resists 29.3% cloud leaks, independent pairwise slopes.' },
                    { id: TrendModel.YUE_PILON_PREWHITENED, name: 'Yue-Pilon TFPW Autocorrelation', desc: 'Pre-whitens serial AR(1) lag-1 noise before Mann-Kendall evaluation.' },
                    { id: TrendModel.MANN_KENDALL_RANK, name: 'Mann-Kendall Monotonic Rank', desc: 'Evaluates direction and significance independent of linearity.' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedModel(m.id)}
                      className={`p-3 rounded-xl border text-left transition-all space-y-1 ${
                        selectedModel === m.id
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/60 shadow-lg'
                          : 'bg-zinc-800/40 text-zinc-400 border-zinc-700/60 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      <div className="font-bold">{m.name}</div>
                      <div className="text-[10px] text-zinc-500">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DYNAMIC TREND TILE LAYER */}
          {activeTab === 'tiles' && (
            <div className="space-y-6">
              {/* Tile Metric Picker */}
              <div className="glass-panel p-5 rounded-xl border border-gray-800 bg-zinc-900/40 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-bold text-white font-mono">Dynamic Trend Raster Tile Metric</h4>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">Endpoint: /api/v1/tiles/trend/&#123;model&#125;/&#123;metric&#125;/&#123;z&#125;/&#123;x&#125;/&#123;y&#125;.png</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                  {TREND_TILE_METRICS.map((metricKey) => {
                    const info = TREND_TILE_METRIC_DETAILS[metricKey] || { name: metricKey, description: '' };
                    const isSelected = selectedMetric === metricKey;
                    return (
                      <button
                        key={metricKey}
                        onClick={() => setSelectedMetric(metricKey)}
                        className={`p-3.5 rounded-xl border text-left transition-all space-y-1.5 ${
                          isSelected
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-lg'
                            : 'bg-zinc-800/40 text-zinc-400 border-zinc-700/60 hover:text-white hover:bg-zinc-800'
                        }`}
                      >
                        <div className="font-bold flex items-center justify-between">
                          <span>{info.name}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <div className="text-[10px] text-zinc-500 line-clamp-2">{info.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Colormap & Opacity Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel p-5 rounded-xl border border-gray-800 bg-zinc-900/40 space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <h4 className="text-sm font-bold text-white font-mono">Colormap Gradient Palette</h4>
                  </div>

                  <div className="space-y-2">
                    {TREND_COLORMAP_OPTIONS.map((cmap) => {
                      const isSelected = selectedColormap === cmap.id;
                      return (
                        <button
                          key={cmap.id}
                          onClick={() => setSelectedColormap(cmap.id)}
                          className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                              : 'bg-zinc-800/40 text-zinc-400 border-zinc-700/60 hover:text-white hover:bg-zinc-800'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="font-mono text-xs font-bold">{cmap.label}</div>
                            <div className="text-[10px] text-zinc-500">{cmap.desc}</div>
                          </div>
                          <div className={`w-24 h-4 rounded-full bg-gradient-to-r ${cmap.gradient} shadow-inner ml-2`} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="glass-panel p-5 rounded-xl border border-gray-800 bg-zinc-900/40 space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-sm font-bold text-white font-mono">Tile Layer Parameters</h4>
                  </div>

                  <div className="space-y-4 text-xs font-mono">
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Layer Opacity:</span>
                        <strong className="text-emerald-400">{Math.round(layerOpacity * 100)}%</strong>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={layerOpacity}
                        onChange={(e) => setLayerOpacity(parseFloat(e.target.value))}
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Target Index:</span>
                        <strong className="text-cyan-400">{targetIndex.toUpperCase()}</strong>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {TREND_TARGET_INDICES.map((idxKey) => (
                          <button
                            key={idxKey}
                            onClick={() => setTargetIndex(idxKey)}
                            className={`px-2 py-1 rounded text-[11px] font-bold border ${
                              targetIndex === idxKey
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                                : 'bg-zinc-800/60 text-zinc-400 border-zinc-700 hover:text-white'
                            }`}
                          >
                            {idxKey.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>Tile URL Template:</span>
                        <button
                          onClick={handleCopyUrl}
                          className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300"
                        >
                          {copiedUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
                        </button>
                      </div>
                      <div className="p-2.5 bg-zinc-950 rounded-lg border border-gray-800 text-[10px] text-zinc-300 break-all select-all">
                        {tileUrlTemplate}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SCIENTIFIC METHODOLOGY & CITATIONS */}
          {activeTab === 'methodology' && (
            <div className="space-y-6 text-xs font-mono">
              <div className="glass-panel p-5 rounded-xl border border-gray-800 bg-zinc-900/40 space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
                  <Info className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-bold text-white">Why Non-Parametric Statistics Are Mandatory in Satellite Earth Observation</h4>
                </div>
                <p className="text-slate-300 leading-relaxed font-sans text-sm">
                  Parametric Ordinary Least Squares (OLS) regression relies strictly on the Gauss-Markov assumptions: normal Gaussian error distribution, homoscedastic variance, and absence of gross outliers. In decadal satellite surface reflectance time series, these assumptions are universally violated due to residual cloud masking leaks, cloud shadows, bidirectional reflectance distribution function (BRDF) variations, and sensor orbital drift. A single undetected cloud shadow artifact can skew an OLS trendline by over 300%.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel p-5 rounded-xl border border-emerald-500/30 bg-zinc-900/40 space-y-3">
                  <h5 className="font-bold text-emerald-400 text-sm">1. Theil-Sen Robust Median Slope Estimator</h5>
                  <div className="p-3 bg-zinc-950 rounded-lg border border-gray-800 text-zinc-300 space-y-1">
                    <div>Q_ij = (x_j - x_i) / (t_j - t_i) for all j &gt; i</div>
                    <div>Q_med = median(Q_ij) across N*(N-1)/2 pairs</div>
                  </div>
                  <p className="text-zinc-400 leading-relaxed font-sans text-xs">
                    Sen's slope estimator calculates the true median rate of change across all possible observation pairs. It exhibits a breakdown point of 29.3%, meaning nearly one-third of all satellite observations can be gross outliers without distorting the estimated trajectory.
                  </p>
                  <div className="text-[10px] text-zinc-500">
                    Citations: Theil, H. (1950), Statistica Neerlandica; Sen, P.K. (1968), Journal of the American Statistical Association.
                  </div>
                </div>

                <div className="glass-panel p-5 rounded-xl border border-cyan-500/30 bg-zinc-900/40 space-y-3">
                  <h5 className="font-bold text-cyan-400 text-sm">2. Mann-Kendall Rank Correlation Test</h5>
                  <div className="p-3 bg-zinc-950 rounded-lg border border-gray-800 text-zinc-300 space-y-1">
                    <div>S = sum_{'{k=1}'}^{'{n-1}'} sum_{'{j=k+1}'}^{'{n}'} sgn(x_j - x_k)</div>
                    <div>Var(S) = [n(n-1)(2n+5) - sum t_k(t_k-1)(2t_k+5)] / 18</div>
                  </div>
                  <p className="text-zinc-400 leading-relaxed font-sans text-xs">
                    Tests whether a monotonic upward or downward trend exists without assuming a linear functional form or normal distribution. Tied observations are strictly accounted for in the variance denominator.
                  </p>
                  <div className="text-[10px] text-zinc-500">
                    Citations: Mann, H.B. (1945), Econometrica; Kendall, M.G. (1975), Rank Correlation Methods.
                  </div>
                </div>

                <div className="glass-panel p-5 rounded-xl border border-amber-500/30 bg-zinc-900/40 space-y-3">
                  <h5 className="font-bold text-amber-400 text-sm">3. Yue-Pilon Trend-Free Pre-Whitening (TFPW)</h5>
                  <div className="p-3 bg-zinc-950 rounded-lg border border-gray-800 text-zinc-300 space-y-1">
                    <div>y'_i = y_i - r_1 * y_{'{i-1}'} (after Theil-Sen detrending)</div>
                    <div>Critical threshold: r_crit = (-1 ± 1.96*sqrt(n-2)) / (n-1)</div>
                  </div>
                  <p className="text-zinc-400 leading-relaxed font-sans text-xs">
                    Satellite observations sampled at 5-day or 16-day intervals frequently exhibit positive serial autocorrelation, which artificially inflates the Type I error rate (false alarm rate) of the standard Mann-Kendall test. Yue-Pilon TFPW detrends the series, removes the AR(1) lag-1 correlation from residuals, and restores unbiased hypothesis testing.
                  </p>
                  <div className="text-[10px] text-zinc-500">
                    Citations: Yue, S., Pilon, P., Phinney, B., &amp; Cavadias, G. (2002), Hydrological Processes.
                  </div>
                </div>

                <div className="glass-panel p-5 rounded-xl border border-purple-500/30 bg-zinc-900/40 space-y-3">
                  <h5 className="font-bold text-purple-400 text-sm">4. Multi-Decadal Landsat &amp; Sentinel-2 Stacking</h5>
                  <div className="p-3 bg-zinc-950 rounded-lg border border-gray-800 text-zinc-300 space-y-1">
                    <div>Cross-Sensor Harmonization: rho_MSI = c_0 + c_1 * rho_OLI</div>
                    <div>120-Month Trajectory: 2016 - 2026 Virtual Constellation</div>
                  </div>
                  <p className="text-zinc-400 leading-relaxed font-sans text-xs">
                    Combines 30m Landsat-8/9 OLI with 10m/20m Sentinel-2A/B/C MSI into a seamless virtual constellation, achieving dense monthly observation coverage across entire multi-decadal time spans.
                  </p>
                  <div className="text-[10px] text-zinc-500">
                    Citations: Roy et al. (2016), Remote Sensing of Environment; Claverie et al. (2018), RSE.
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800 bg-zinc-900/70 text-xs font-mono flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-all"
              title="Copy Trajectory Data & Statistics as JSON"
            >
              {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedJson ? 'JSON Copied' : 'Copy JSON'}</span>
            </button>
            <button
              onClick={handleDownloadCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-all"
              title="Download Observation Trajectory CSV"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-slate-300 font-bold transition-all"
            >
              Close
            </button>
            <button
              onClick={handleApplyLayer}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold shadow-lg shadow-emerald-900/40 transition-all"
            >
              <Layers className="w-4 h-4" />
              <span>Apply TrendLayer to Map</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
