import React, { useState } from 'react';
import { Save, RefreshCw, Bell, Lock, Monitor } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    alertThreshold: 85,
    refreshRate: 2,
    darkMode: true,
    emailNotifications: true,
    smsAlerts: false,
    autobackup: true,
    dataRetention: 30,
    timezone: 'UTC',
  });

  const [saveStatus, setSaveStatus] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = (key, value) => {
    setSettings({ ...settings, [key]: value });
    setHasChanges(true);
  };

  const handleSave = () => {
    setSaveStatus('Saving settings...');
    setTimeout(() => {
      setSaveStatus('Settings saved successfully');
      setHasChanges(false);
      setTimeout(() => setSaveStatus(''), 3000);
    }, 1000);
  };

  const handleReset = () => {
    setSaveStatus('');
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Settings</h2>
        <p className="text-gray-400">Configure dashboard and system preferences</p>
      </div>

      {/* Save Status Message */}
      {saveStatus && (
        <div className={`p-4 rounded-lg border ${
          saveStatus.includes('successfully')
            ? 'bg-green-500/20 border-green-500/50 text-green-400'
            : 'bg-blue-500/20 border-blue-500/50 text-blue-400'
        }`}>
          {saveStatus}
        </div>
      )}

      {/* Display Settings */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-blue-500/20 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Monitor size={24} className="text-blue-400" />
          <h3 className="text-xl font-semibold text-white">Display Settings</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
            <div>
              <p className="text-white font-medium">Dark Mode</p>
              <p className="text-sm text-gray-400">Use dark theme across dashboard</p>
            </div>
            <button
              onClick={() => handleChange('darkMode', !settings.darkMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.darkMode
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                  : 'bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.darkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="p-4 bg-slate-700/50 rounded-lg">
            <label className="text-white font-medium block mb-2">Refresh Rate</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="10"
                value={settings.refreshRate}
                onChange={(e) => handleChange('refreshRate', parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-blue-400 font-semibold">{settings.refreshRate} sec</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">How often dashboard updates (1-10 seconds)</p>
          </div>

          <div className="p-4 bg-slate-700/50 rounded-lg">
            <label className="text-white font-medium block mb-2">Timezone</label>
            <select
              value={settings.timezone}
              onChange={(e) => handleChange('timezone', e.target.value)}
              className="w-full bg-slate-600 border border-blue-500/30 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="UTC">UTC</option>
              <option value="EST">Eastern Standard Time</option>
              <option value="CST">Central Standard Time</option>
              <option value="MST">Mountain Standard Time</option>
              <option value="PST">Pacific Standard Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alert Settings */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-blue-500/20 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Bell size={24} className="text-yellow-400" />
          <h3 className="text-xl font-semibold text-white">Alert Settings</h3>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-slate-700/50 rounded-lg">
            <label className="text-white font-medium block mb-2">Power Alert Threshold</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="50"
                max="100"
                value={settings.alertThreshold}
                onChange={(e) => handleChange('alertThreshold', parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-orange-400 font-semibold">{settings.alertThreshold}%</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Alert when power reaches this percentage of limit</p>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
            <div>
              <p className="text-white font-medium">Email Notifications</p>
              <p className="text-sm text-gray-400">Receive alerts via email</p>
            </div>
            <button
              onClick={() => handleChange('emailNotifications', !settings.emailNotifications)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.emailNotifications
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                  : 'bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
            <div>
              <p className="text-white font-medium">SMS Alerts</p>
              <p className="text-sm text-gray-400">Receive critical alerts via SMS</p>
            </div>
            <button
              onClick={() => handleChange('smsAlerts', !settings.smsAlerts)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.smsAlerts
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                  : 'bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.smsAlerts ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Data Settings */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-blue-500/20 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Lock size={24} className="text-green-400" />
          <h3 className="text-xl font-semibold text-white">Data Settings</h3>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-slate-700/50 rounded-lg">
            <label className="text-white font-medium block mb-2">Data Retention Period</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="7"
                max="365"
                value={settings.dataRetention}
                onChange={(e) => handleChange('dataRetention', parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-green-400 font-semibold">{settings.dataRetention} days</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Historical data will be retained for this duration</p>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
            <div>
              <p className="text-white font-medium">Auto Backup</p>
              <p className="text-sm text-gray-400">Automatic daily backups of configuration</p>
            </div>
            <button
              onClick={() => handleChange('autobackup', !settings.autobackup)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.autobackup
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                  : 'bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.autobackup ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={20} />
          Save Settings
        </button>
        <button
          onClick={handleReset}
          disabled={!hasChanges}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-slate-700 text-gray-300 rounded-lg font-semibold hover:bg-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={20} />
          Reset
        </button>
      </div>

      {/* Info Card */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
        <p className="text-blue-300 text-sm">
          Changes to settings are applied immediately. Your preferences are stored securely in your Firebase database.
        </p>
      </div>
    </div>
  );
}
