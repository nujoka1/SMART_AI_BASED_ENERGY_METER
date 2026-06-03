import React, { useState } from 'react';
import { Power, AlertCircle, Radio } from 'lucide-react';
import { setRelayCommand } from '../firebase-config';

export default function ControlPanel({ liveData }) {
  const [zones, setZones] = useState([
    { id: 1, name: 'Zone A - Lighting', status: true, manualOverride: false },
    { id: 2, name: 'Zone B - HVAC', status: false, manualOverride: false },
    { id: 3, name: 'Zone C - Equipment', status: true, manualOverride: false },
    { id: 4, name: 'Zone D - General', status: true, manualOverride: false },
  ]);

  const [confirmingZone, setConfirmingZone] = useState(null);
  const [controlMessage, setControlMessage] = useState('');

  const toggleZone = async (zoneId) => {
    try {
      const zone = zones.find(z => z.id === zoneId);
      const newStatus = !zone.status;
      
      await setRelayCommand(zoneId, newStatus);

      setZones(zones.map(z => z.id === zoneId ? { ...z, status: newStatus } : z));
      setControlMessage(`Zone ${zoneId} turned ${newStatus ? 'ON' : 'OFF'}`);
      setTimeout(() => setControlMessage(''), 3000);
      setConfirmingZone(null);
    } catch (error) {
      console.error('Error toggling zone:', error);
      setControlMessage('Error: Failed to update zone');
    }
  };

  const toggleManualOverride = (zoneId) => {
    setZones(zones.map(z => 
      z.id === zoneId ? { ...z, manualOverride: !z.manualOverride } : z
    ));
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Zone Control</h2>
        <p className="text-gray-400">Manage relay control for different zones</p>
      </div>

      {/* Warning Alert */}
      <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/50 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle size={24} className="text-yellow-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-yellow-400 font-semibold mb-1">Manual Override Active</h3>
          <p className="text-yellow-300/80 text-sm">
            When manual override is enabled, AI automation is bypassed for that zone.
          </p>
        </div>
      </div>

      {/* Control Message */}
      {controlMessage && (
        <div className={`p-4 rounded-lg border ${
          controlMessage.includes('Error')
            ? 'bg-red-500/20 border-red-500/50 text-red-400'
            : 'bg-green-500/20 border-green-500/50 text-green-400'
        }`}>
          {controlMessage}
        </div>
      )}

      {/* Zone Control Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {zones.map(zone => (
          <div
            key={zone.id}
            className="bg-gradient-to-br from-slate-800 to-slate-700 border border-blue-500/20 rounded-xl p-6 hover:border-blue-500/50 transition-all"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white mb-1">{zone.name}</h3>
                <p className="text-sm text-gray-400 flex items-center gap-2">
                  <Radio size={14} />
                  {zone.manualOverride ? 'Manual Mode' : 'Auto Mode'}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                zone.status
                  ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                  : 'bg-gradient-to-br from-slate-600 to-slate-700'
              }`}>
                <Power size={24} className="text-white" />
              </div>
            </div>

            {/* Status Indicator */}
            <div className="mb-6 p-4 bg-slate-700/50 rounded-lg">
              <p className="text-xs text-gray-400 mb-2">Current Status</p>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${zone.status ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                <span className={`font-semibold ${zone.status ? 'text-green-400' : 'text-red-400'}`}>
                  {zone.status ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
            </div>

            {/* Manual Override Toggle */}
            <div className="mb-6 flex items-center justify-between p-3 bg-slate-700/30 rounded-lg border border-slate-600/50">
              <label className="text-sm text-gray-300 font-medium">Manual Override</label>
              <button
                onClick={() => toggleManualOverride(zone.id)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  zone.manualOverride
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                    : 'bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    zone.manualOverride ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Control Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmingZone(zone.id)}
                disabled={confirmingZone !== null && confirmingZone !== zone.id}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  zone.status
                    ? 'bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30'
                    : 'bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30'
                } disabled:opacity-50`}
              >
                {zone.status ? 'Turn Off' : 'Turn On'}
              </button>
              {confirmingZone === zone.id && (
                <>
                  <button
                    onClick={() => toggleZone(zone.id)}
                    className="flex-1 py-2 px-4 rounded-lg font-medium bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 transition-all"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmingZone(null)}
                    className="flex-1 py-2 px-4 rounded-lg font-medium bg-slate-600 text-gray-300 hover:bg-slate-700 transition-all"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* System Stats */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-blue-500/20 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">System Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-2">Active Zones</p>
            <p className="text-3xl font-bold text-green-400">{zones.filter(z => z.status).length}</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-2">Inactive Zones</p>
            <p className="text-3xl font-bold text-red-400">{zones.filter(z => !z.status).length}</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-2">Manual Override</p>
            <p className="text-3xl font-bold text-blue-400">{zones.filter(z => z.manualOverride).length}</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-2">Total Power</p>
            <p className="text-3xl font-bold text-yellow-400">{liveData?.power || 0} W</p>
          </div>
        </div>
      </div>
    </div>
  );
}
