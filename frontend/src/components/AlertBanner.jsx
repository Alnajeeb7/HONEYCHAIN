import React from 'react';
import { AlertTriangle, ShieldAlert, Leaf, X } from 'lucide-react';

const STYLES = {
  fraud:          { icon: ShieldAlert,   cls: 'bg-red-50 border-red-300 text-red-800',        label: 'Fraud Blocked' },
  tamper:         { icon: AlertTriangle, cls: 'bg-rose-50 border-rose-300 text-rose-800',      label: 'Tampering Detected' },
  sustainability: { icon: Leaf,          cls: 'bg-amber-50 border-amber-300 text-amber-800',   label: 'Sustainability Alert' },
  disease:        { icon: AlertTriangle, cls: 'bg-orange-50 border-orange-300 text-orange-800',label: 'Hive Disease Alert' },
};

export default function AlertBanner({ alert, onClose }) {
  if (!alert) return null;
  const s = STYLES[alert.type] || STYLES.fraud;
  const Icon = s.icon;
  return (
    <div className={`border rounded-xl p-4 flex items-start gap-3 shadow-sm ${s.cls}`}>
      <Icon className="w-6 h-6 shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold uppercase text-xs tracking-wide">{s.label}</span>
          {alert.severity && (
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-black/10">
              {alert.severity}
            </span>
          )}
        </div>
        <p className="font-semibold text-sm">{alert.message}</p>
        {alert.detail && <p className="text-xs mt-1 opacity-80">{alert.detail}</p>}
      </div>
      {onClose && (
        <button onClick={onClose} className="opacity-60 hover:opacity-100 transition-opacity">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
