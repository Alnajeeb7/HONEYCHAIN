import React from 'react';
import { Check } from 'lucide-react';
import { STAGES, STAGE_LABEL, stageIndex } from '../api';

export default function Stepper({ current }) {
  const curIdx = stageIndex(current);
  return (
    <div className="flex items-center w-full">
      {STAGES.map((stage, i) => {
        const done = i <= curIdx;
        const active = i === curIdx;
        return (
          <React.Fragment key={stage}>
            <div className="flex flex-col items-center shrink-0">
              <div className={`flex items-center justify-center w-9 h-9 rounded-full border-2 text-sm font-bold transition-all
                ${done ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-slate-300 text-slate-400'}
                ${active ? 'ring-4 ring-amber-100' : ''}`}>
                {done ? <Check className="w-5 h-5" /> : i + 1}
              </div>
              <span className={`text-[11px] mt-1.5 font-medium ${done ? 'text-amber-700' : 'text-slate-400'}`}>
                {STAGE_LABEL[stage]}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-5 rounded ${i < curIdx ? 'bg-amber-400' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
