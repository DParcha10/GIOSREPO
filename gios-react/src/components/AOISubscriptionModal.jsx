import React, { useState } from 'react';
import { 
  X, Radio, Bell, ShieldCheck, CheckCircle2, AlertCircle, 
  MapPin, Send, Sliders, Globe, Layers, Webhook, Mail, MessageSquare
} from 'lucide-react';
import { 
  createAOISubscription,
  SUBSCRIPTION_TRIGGER_TYPES,
  NOTIFICATION_CHANNELS,
  formatBbox,
  parseBbox
} from '../api/giosApi';

export default function AOISubscriptionModal({
  isOpen,
  onClose,
  currentBbox = null,
  activeAssetId = 'dam-san-luis',
  onSubscriptionCreated
}) {
  const [name, setName] = useState('San Luis Reservoir Continuous Inundation & Seepage Watch');
  const [bboxInput, setBboxInput] = useState(() => {
    if (currentBbox) return formatBbox(currentBbox);
    return '-121.1200, 37.0300, -121.0400, 37.0800';
  });
  const [assetId, setAssetId] = useState(activeAssetId || 'dam-san-luis');
  const [collection, setCollection] = useState('sentinel-2-l2a');
  const [selectedIndices, setSelectedIndices] = useState(['ndmi', 'ndvi']);
  const [triggerType, setTriggerType] = useState(SUBSCRIPTION_TRIGGER_TYPES.Z_SCORE_ANOMALY);
  const [zScoreThreshold, setZScoreThreshold] = useState(2.5);
  const [channels, setChannels] = useState([NOTIFICATION_CHANNELS.IN_APP_ALERT, NOTIFICATION_CHANNELS.EMAIL]);
  const [webhookUrl, setWebhookUrl] = useState('https://api.gios.internal/webhooks/geotechnical-alert');
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  const toggleIndex = (idx) => {
    setSelectedIndices(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const toggleChannel = (ch) => {
    setChannels(prev => 
      prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]
    );
  };

  const handleUseCurrentViewport = () => {
    if (currentBbox) {
      setBboxInput(formatBbox(currentBbox));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const parsed = parseBbox(bboxInput);
      const payload = {
        name,
        bbox: parsed,
        asset_id: assetId,
        collection,
        indices: selectedIndices.length > 0 ? selectedIndices : ['ndmi'],
        trigger_type: triggerType,
        z_score_threshold: Number(zScoreThreshold),
        channels,
        webhook_url: channels.includes('webhook') ? webhookUrl : null,
        is_active: isActive
      };

      const result = await createAOISubscription(payload);
      setSuccessMsg(`Automated monitoring subscription "${result.name || name}" configured successfully!`);
      if (onSubscriptionCreated) onSubscriptionCreated(result);
      setTimeout(() => {
        onClose();
      }, 1300);
    } catch (err) {
      console.error('Failed to create subscription:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to register subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-gray-900/95 border border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.25)] rounded-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                Automated AOI Monitoring Subscription
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  T-57 / T-58
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Continuous satellite ingestion trigger, climatological Z-score anomaly alerting & webhooks
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs bg-red-900/30 border border-red-500/40 text-red-300 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 text-xs bg-emerald-900/30 border border-emerald-500/40 text-emerald-300 rounded-lg">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-mono text-gray-400 mb-1">
              Subscription Label / Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-mono text-gray-400">
                Monitored Bounding Box (minLon, minLat, maxLon, maxLat) *
              </label>
              {currentBbox && (
                <button
                  type="button"
                  onClick={handleUseCurrentViewport}
                  className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  <MapPin className="w-3 h-3" />
                  Use Current Map View
                </button>
              )}
            </div>
            <input
              type="text"
              required
              value={bboxInput}
              onChange={(e) => setBboxInput(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-gray-400 mb-1">
                Target Infrastructure Asset ID
              </label>
              <input
                type="text"
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-gray-400 mb-1">
                Satellite Constellation
              </label>
              <select
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 font-mono focus:border-cyan-500 focus:outline-none"
              >
                <option value="sentinel-2-l2a">Sentinel-2 MSI (10m Optical)</option>
                <option value="landsat-c2-l2">Landsat 8/9 OLI-2 (30m Optical/Thermal)</option>
                <option value="sentinel-1-rtc">Sentinel-1 C-Band SAR (10m Radar)</option>
                <option value="cop-dem-glo-30">Copernicus DEM (30m Elevation)</option>
              </select>
            </div>
          </div>

          {/* Biophysical Indices Selection */}
          <div>
            <label className="block text-[11px] font-mono text-gray-400 mb-1.5">
              Monitored Biophysical Indices
            </label>
            <div className="flex flex-wrap gap-2">
              {['ndmi', 'ndvi', 'mndwi', 'lst', 'nbr'].map((idx) => {
                const active = selectedIndices.includes(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleIndex(idx)}
                    className={`px-3 py-1 rounded text-xs font-mono font-bold uppercase transition-all ${
                      active
                        ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {idx}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trigger Condition & Sensitivity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-gray-400 mb-1">
                Alert Trigger Condition
              </label>
              <select
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 font-mono focus:border-cyan-500 focus:outline-none"
              >
                <option value={SUBSCRIPTION_TRIGGER_TYPES.Z_SCORE_ANOMALY}>Climatological Z-Score (|z| &ge; threshold)</option>
                <option value={SUBSCRIPTION_TRIGGER_TYPES.NEW_SCENE_INGESTED}>New Scene Ingested (Every Overpass)</option>
                <option value={SUBSCRIPTION_TRIGGER_TYPES.INDEX_THRESHOLD}>Index Exceedance Threshold</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-mono text-gray-400 mb-1">
                Z-Score Sensitivity Threshold (|z|)
              </label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="5.0"
                value={zScoreThreshold}
                onChange={(e) => setZScoreThreshold(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Notification Channels */}
          <div>
            <label className="block text-[11px] font-mono text-gray-400 mb-1.5">
              Outbound Notification Channels
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: NOTIFICATION_CHANNELS.IN_APP_ALERT, label: 'In-App', icon: Bell },
                { id: NOTIFICATION_CHANNELS.EMAIL, label: 'Email', icon: Mail },
                { id: NOTIFICATION_CHANNELS.SLACK, label: 'Slack', icon: MessageSquare },
                { id: NOTIFICATION_CHANNELS.WEBHOOK, label: 'Webhook', icon: Webhook }
              ].map((item) => {
                const active = channels.includes(item.id);
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleChannel(item.id)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded text-xs font-mono transition-all border ${
                      active
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                        : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {channels.includes(NOTIFICATION_CHANNELS.WEBHOOK) && (
            <div>
              <label className="block text-[11px] font-mono text-gray-400 mb-1">
                Target Webhook HTTP POST Endpoint
              </label>
              <input
                type="url"
                required
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
          )}

          {/* Active status */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="subscription-is-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded bg-gray-950 border-gray-700 text-cyan-500 focus:ring-cyan-500"
            />
            <label htmlFor="subscription-is-active" className="text-xs text-gray-300 font-mono">
              Activate automated watchdog polling immediately upon registration
            </label>
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono text-gray-400 hover:text-white rounded bg-gray-800/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-mono font-bold uppercase rounded bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Radio className="w-4 h-4" />
                  Activate Subscription
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
