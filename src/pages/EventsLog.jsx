import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { fetchEventLog } from '../firebase-config';

const normalizeEvent = (event, index) => {
  const timestamp = event?.ts ? new Date(event.ts * 1000) : new Date(event?.timestamp || Date.now());
  const type = event?.type || event?.event || 'info';
  const severity = event?.severity || (type === 'anomaly' ? 'high' : type === 'relay_trip' ? 'warning' : 'info');
  const message = event?.message || event?.description || event?.detail || `${type.replace(/_/g, ' ')} event`;

  return {
    id: event?.id || `${timestamp.getTime()}-${index}`,
    type,
    severity,
    message,
    zone: event?.zone || event?.label || 'System',
    timestamp,
  };
};

export default function EventsLog() {
  const [events, setEvents] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');

  useEffect(() => {
    loadEvents();
    const interval = setInterval(loadEvents, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadEvents = async () => {
    try {
      const data = await fetchEventLog(500);
      setEvents((data || []).map((event, index) => normalizeEvent(event, index)));
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
    }
  };

  const eventTypes = [
    { value: 'all', label: 'All Events' },
    { value: 'relay_trip', label: 'Relay Trip' },
    { value: 'manual_command', label: 'Manual Command' },
    { value: 'anomaly', label: 'Anomaly' },
    { value: 'threshold', label: 'Threshold Alert' },
    { value: 'connection', label: 'Connection' },
  ];

  const severityOptions = [
    { value: 'all', label: 'All Severity' },
    { value: 'high', label: 'High' },
    { value: 'warning', label: 'Warning' },
    { value: 'info', label: 'Info' },
    { value: 'success', label: 'Success' },
  ];

  const getEventIcon = (type) => {
    switch (type) {
      case 'relay_trip':
        return <AlertTriangle size={20} />;
      case 'anomaly':
        return <AlertTriangle size={20} />;
      case 'connection':
        return <Info size={20} />;
      case 'manual_command':
        return <Info size={20} />;
      default:
        return <CheckCircle size={20} />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'from-red-500 to-red-600 text-red-400 bg-red-500/10 border-red-500/30';
      case 'warning':
        return 'from-yellow-500 to-yellow-600 text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'info':
        return 'from-blue-500 to-blue-600 text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'success':
        return 'from-green-500 to-green-600 text-green-400 bg-green-500/10 border-green-500/30';
      default:
        return 'from-gray-500 to-gray-600 text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  const filteredEvents = events.filter(event => {
    const typeMatch = filterType === 'all' || event.type === filterType;
    const severityMatch = filterSeverity === 'all' || event.severity === filterSeverity;
    return typeMatch && severityMatch;
  });

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Events and Logs</h2>
        <p className="text-gray-400">System events, alerts, and historical actions</p>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Event Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full bg-slate-700 border border-blue-500/30 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
          >
            {eventTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Severity</label>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="w-full bg-slate-700 border border-blue-500/30 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
          >
            {severityOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {filteredEvents.length > 0 ? (
          filteredEvents.map(event => {
            const severityClass = getSeverityColor(event.severity);
            return (
              <div
                key={event.id}
                className={`bg-gradient-to-r ${severityClass} border rounded-lg p-4 flex items-start gap-4`}
              >
                <div className="flex-shrink-0 mt-1">
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="font-semibold capitalize">
                        {event.type.replace(/_/g, ' ')}
                      </h3>
                      <p className="text-sm opacity-90">{event.message}</p>
                    </div>
                    <div className="text-xs opacity-75 whitespace-nowrap">
                      {event.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <p className="text-xs opacity-75 mt-2">{event.zone}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-slate-800 rounded-lg p-8 text-center">
            <Clock size={32} className="text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No events match the current filters</p>
          </div>
        )}
      </div>

      {/* Event Statistics */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-blue-500/20 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Event Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-700/50 rounded-lg p-4 border border-blue-500/10">
            <p className="text-gray-400 text-sm mb-2">Total Events</p>
            <p className="text-2xl font-bold text-blue-400">{events.length}</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4 border border-blue-500/10">
            <p className="text-gray-400 text-sm mb-2">High Severity</p>
            <p className="text-2xl font-bold text-red-400">{events.filter(e => e.severity === 'high').length}</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4 border border-blue-500/10">
            <p className="text-gray-400 text-sm mb-2">Warnings</p>
            <p className="text-2xl font-bold text-yellow-400">{events.filter(e => e.severity === 'warning').length}</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4 border border-blue-500/10">
            <p className="text-gray-400 text-sm mb-2">Info Events</p>
            <p className="text-2xl font-bold text-blue-400">{events.filter(e => e.severity === 'info').length}</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4 border border-blue-500/10">
            <p className="text-gray-400 text-sm mb-2">Success</p>
            <p className="text-2xl font-bold text-green-400">{events.filter(e => e.severity === 'success').length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
