'use client';

/**
 * WheelTimePicker Component
 * 
 * User-friendly time picker with:
 * - Manual input fields (hour, minute, AM/PM dropdowns)
 * - Optional collapsible wheel picker
 * - All 60 minutes available
 * 
 * Features:
 * - Easy manual entry with proper input fields
 * - Dropdown selectors for hour/minute/AM-PM
 * - Optional wheel picker (collapsible)
 * - Mouse wheel support on wheels
 * - Glassmorphic emerald theme
 * - Returns time in 24-hour format (HH:MM)
 */

import { useState, useEffect, useRef } from 'react';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface WheelTimePickerProps {
  value: string; // 24-hour format "HH:MM"
  onChange: (time: string) => void;
  disabled?: boolean;
}

export default function WheelTimePicker({ value, onChange, disabled = false }: WheelTimePickerProps) {
  // Parse initial value
  const parseTime = (time24: string) => {
    const [hours24, minutes] = time24.split(':').map(Number);
    const isPM = hours24 >= 12;
    const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
    return { hours12, minutes, isPM };
  };

  const { hours12: initialHours, minutes: initialMinutes, isPM: initialIsPM } = parseTime(value);

  const [selectedHour, setSelectedHour] = useState(initialHours);
  const [selectedMinute, setSelectedMinute] = useState(initialMinutes);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(initialIsPM ? 'PM' : 'AM');
  const [showWheels, setShowWheels] = useState(false);

  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const periodRef = useRef<HTMLDivElement>(null);

  // Generate arrays
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const periods: ('AM' | 'PM')[] = ['AM', 'PM'];

  // Generate arrays
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const periods: ('AM' | 'PM')[] = ['AM', 'PM'];

  // Convert to 24-hour format and notify parent
  useEffect(() => {
    let hours24 = selectedHour;
    if (selectedPeriod === 'AM' && selectedHour === 12) {
      hours24 = 0;
    } else if (selectedPeriod === 'PM' && selectedHour !== 12) {
      hours24 = selectedHour + 12;
    }
    const time24 = `${hours24.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    onChange(time24);
  }, [selectedHour, selectedMinute, selectedPeriod, onChange]);

  // Scroll to selected item on mount and when value changes
  useEffect(() => {
    const scrollToSelected = (ref: React.RefObject<HTMLDivElement>, index: number) => {
      if (ref.current) {
        const itemHeight = 40; // Height of each item
        ref.current.scrollTop = index * itemHeight - itemHeight * 2; // Center the selected item
      }
    };

    scrollToSelected(hourRef, selectedHour - 1);
    scrollToSelected(minuteRef, selectedMinute);
    scrollToSelected(periodRef, selectedPeriod === 'AM' ? 0 : 1);
  }, []);

  const handleScroll = (
    ref: React.RefObject<HTMLDivElement>,
    items: any[],
    setter: (value: any) => void
  ) => {
    if (!ref.current) return;

    const itemHeight = 40;
    const scrollTop = ref.current.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
    
    setter(items[clampedIndex]);

    // Snap to center
    ref.current.scrollTop = clampedIndex * itemHeight;
  };

  const handleWheel = (
    e: React.WheelEvent<HTMLDivElement>,
    ref: React.RefObject<HTMLDivElement>,
    items: any[],
    currentValue: any,
    setter: (value: any) => void
  ) => {
    e.preventDefault();
    
    const currentIndex = items.indexOf(currentValue);
    const delta = e.deltaY > 0 ? 1 : -1;
    const newIndex = Math.max(0, Math.min(currentIndex + delta, items.length - 1));
    
    setter(items[newIndex]);
    
    if (ref.current) {
      const itemHeight = 40;
      ref.current.scrollTop = newIndex * itemHeight;
    }
  };

  const handleManualHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= 1 && val <= 12) {
      setSelectedHour(val);
    }
  };

  const handleManualMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= 0 && val <= 59) {
      setSelectedMinute(val);
    }
  };

  const renderWheel = (
    items: any[],
    selectedValue: any,
    ref: React.RefObject<HTMLDivElement>,
    setter: (value: any) => void,
    formatter?: (item: any) => string
  ) => (
    <div className="relative h-[200px] overflow-hidden rounded-lg bg-white/5 border border-emerald-500/20">
      {/* Selection highlight */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[40px] bg-emerald-500/20 border-y-2 border-emerald-500/50 pointer-events-none z-10" />
      
      {/* Gradient overlays for fade effect */}
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-slate-900 via-slate-900/80 to-transparent pointer-events-none z-20" />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent pointer-events-none z-20" />
      
      {/* Scrollable wheel */}
      <div
        ref={ref}
        onScroll={() => handleScroll(ref, items, setter)}
        onWheel={(e) => handleWheel(e, ref, items, selectedValue, setter)}
        className="h-full overflow-y-scroll scrollbar-hide snap-y snap-mandatory"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* Top padding */}
        <div className="h-[80px]" />
        
        {/* Items */}
        {items.map((item, index) => (
          <div
            key={index}
            className={`h-[40px] flex items-center justify-center text-xl font-semibold transition-all snap-center cursor-pointer ${
              item === selectedValue
                ? 'text-emerald-400 scale-110'
                : 'text-white/30 scale-90 hover:text-white/50'
            }`}
            onClick={() => {
              setter(item);
              if (ref.current) {
                const itemHeight = 40;
                ref.current.scrollTop = index * itemHeight;
              }
            }}
          >
            {formatter ? formatter(item) : item}
          </div>
        ))}
        
        {/* Bottom padding */}
        <div className="h-[80px]" />
      </div>
    </div>
  );

  if (disabled) {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-emerald-500/20 rounded-lg text-white/40">
        <Clock className="w-5 h-5" />
        <span className="text-lg font-medium">
          {selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')} {selectedPeriod}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Manual Time Input - Full Width Row */}
      <div className="bg-white/5 border border-emerald-500/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span className="text-sm text-emerald-300 font-medium">Select Time</span>
        </div>
        
        <div className="grid grid-cols-7 gap-3 items-center">
          {/* Hour Dropdown */}
          <div className="col-span-2">
            <select
              value={selectedHour}
              onChange={handleManualHourChange}
              className="w-full px-3 py-2.5 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-center text-base font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50 cursor-pointer appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2310b981'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.25rem center',
                backgroundSize: '1.25em 1.25em'
              }}
            >
              {hours.map(h => (
                <option key={h} value={h}>{h.toString().padStart(2, '0')}</option>
              ))}
            </select>
            <div className="text-xs text-emerald-300/70 text-center mt-1">Hour</div>
          </div>

          {/* Separator */}
          <div className="text-2xl text-emerald-400 font-bold text-center">:</div>

          {/* Minute Dropdown */}
          <div className="col-span-2">
            <select
              value={selectedMinute}
              onChange={handleManualMinuteChange}
              className="w-full px-3 py-2.5 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-center text-base font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50 cursor-pointer appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2310b981'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.25rem center',
                backgroundSize: '1.25em 1.25em'
              }}
            >
              {minutes.map(m => (
                <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
              ))}
            </select>
            <div className="text-xs text-emerald-300/70 text-center mt-1">Minute</div>
          </div>

          {/* AM/PM Dropdown */}
          <div className="col-span-2">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as 'AM' | 'PM')}
              className="w-full px-3 py-2.5 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-center text-base font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50 cursor-pointer appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2310b981'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.25rem center',
                backgroundSize: '1.25em 1.25em'
              }}
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
            <div className="text-xs text-emerald-300/70 text-center mt-1">Period</div>
          </div>
        </div>

        {/* Selected time display */}
        <div className="mt-4 text-center bg-emerald-500/10 rounded-lg py-2.5 border border-emerald-500/30">
          <div className="text-xs text-emerald-300/70 mb-1">Selected Time</div>
          <div className="text-xl font-bold text-emerald-400">
            {selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')} {selectedPeriod}
          </div>
        </div>
      </div>

      {/* Toggle Button for Wheel Picker */}
      <button
        type="button"
        onClick={() => setShowWheels(!showWheels)}
        className="w-full px-4 py-2.5 bg-white/5 border border-emerald-500/30 rounded-lg text-emerald-300 text-sm font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
      >
        {showWheels ? (
          <>
            <ChevronUp className="w-4 h-4" />
            Hide Wheel Picker
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            Show Wheel Picker
          </>
        )}
      </button>

      {/* Wheel Picker (Collapsible) */}
      {showWheels && (
        <div className="bg-gradient-to-br from-white/5 to-emerald-500/5 border border-emerald-500/30 rounded-lg p-4">
          <div className="text-center text-sm text-emerald-300 mb-3 font-medium">
            Scroll or use mouse wheel
          </div>
          <div className="grid grid-cols-3 gap-3">
            {/* Hours */}
            <div>
              <div className="text-center text-xs text-emerald-300/70 mb-2 font-medium">Hour</div>
              {renderWheel(hours, selectedHour, hourRef, setSelectedHour, (h) => h.toString().padStart(2, '0'))}
            </div>

            {/* Minutes */}
            <div>
              <div className="text-center text-xs text-emerald-300/70 mb-2 font-medium">Min</div>
              {renderWheel(minutes, selectedMinute, minuteRef, setSelectedMinute, (m) => m.toString().padStart(2, '0'))}
            </div>

            {/* AM/PM */}
            <div>
              <div className="text-center text-xs text-emerald-300/70 mb-2 font-medium">Period</div>
              {renderWheel(periods, selectedPeriod, periodRef, setSelectedPeriod)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
