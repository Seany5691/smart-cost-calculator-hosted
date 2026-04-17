'use client';

/**
 * WheelTimePicker Component
 * 
 * Comprehensive hybrid time picker with 3 input methods:
 * 1. Manual typing in input fields
 * 2. Dropdown selection for hours/minutes  
 * 3. Optional wheel picker (collapsible)
 * 
 * Features:
 * - Type directly into hour/minute fields
 * - Click dropdown arrow to select from list
 * - Optional wheel picker for visual selection
 * - All 60 minutes available
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
  const [showHourDropdown, setShowHourDropdown] = useState(false);
  const [showMinuteDropdown, setShowMinuteDropdown] = useState(false);
  const [hourInputValue, setHourInputValue] = useState(initialHours.toString().padStart(2, '0'));
  const [minuteInputValue, setMinuteInputValue] = useState(initialMinutes.toString().padStart(2, '0'));

  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const periodRef = useRef<HTMLDivElement>(null);
  const hourDropdownRef = useRef<HTMLDivElement>(null);
  const minuteDropdownRef = useRef<HTMLDivElement>(null);

  // Generate arrays
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const periods: ('AM' | 'PM')[] = ['AM', 'PM'];

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (hourDropdownRef.current && !hourDropdownRef.current.contains(event.target as Node)) {
        setShowHourDropdown(false);
      }
      if (minuteDropdownRef.current && !minuteDropdownRef.current.contains(event.target as Node)) {
        setShowMinuteDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Scroll to selected item on mount
  useEffect(() => {
    const scrollToSelected = (ref: React.RefObject<HTMLDivElement>, index: number) => {
      if (ref.current) {
        const itemHeight = 40;
        ref.current.scrollTop = index * itemHeight - itemHeight * 2;
      }
    };

    scrollToSelected(hourRef, selectedHour - 1);
    scrollToSelected(minuteRef, selectedMinute);
    scrollToSelected(periodRef, selectedPeriod === 'AM' ? 0 : 1);
  }, []);

  // Handle manual hour typing
  const handleHourInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    
    // Allow empty or partial input while typing
    if (val === '') {
      setHourInputValue('');
      return;
    }
    
    // Only allow numeric input
    if (!/^\d+$/.test(val)) {
      return;
    }
    
    setHourInputValue(val);
    
    // Update selected hour if valid
    const numVal = parseInt(val, 10);
    if (!isNaN(numVal) && numVal >= 1 && numVal <= 12) {
      setSelectedHour(numVal);
    }
  };

  // Handle manual minute typing
  const handleMinuteInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    
    // Allow empty or partial input while typing
    if (val === '') {
      setMinuteInputValue('');
      return;
    }
    
    // Only allow numeric input
    if (!/^\d+$/.test(val)) {
      return;
    }
    
    setMinuteInputValue(val);
    
    // Update selected minute if valid
    const numVal = parseInt(val, 10);
    if (!isNaN(numVal) && numVal >= 0 && numVal <= 59) {
      setSelectedMinute(numVal);
    }
  };

  // Handle hour input blur (validate and format)
  const handleHourBlur = () => {
    const numVal = parseInt(hourInputValue);
    if (isNaN(numVal) || numVal < 1 || numVal > 12) {
      setHourInputValue(selectedHour.toString().padStart(2, '0'));
    } else {
      setSelectedHour(numVal);
      setHourInputValue(numVal.toString().padStart(2, '0'));
    }
  };

  // Handle minute input blur (validate and format)
  const handleMinuteBlur = () => {
    const numVal = parseInt(minuteInputValue);
    if (isNaN(numVal) || numVal < 0 || numVal > 59) {
      setMinuteInputValue(selectedMinute.toString().padStart(2, '0'));
    } else {
      setSelectedMinute(numVal);
      setMinuteInputValue(numVal.toString().padStart(2, '0'));
    }
  };

  // Handle hour selection from dropdown
  const handleHourSelect = (hour: number) => {
    setSelectedHour(hour);
    setHourInputValue(hour.toString().padStart(2, '0'));
    setShowHourDropdown(false);
  };

  // Handle minute selection from dropdown
  const handleMinuteSelect = (minute: number) => {
    setSelectedMinute(minute);
    setMinuteInputValue(minute.toString().padStart(2, '0'));
    setShowMinuteDropdown(false);
  };

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

  const renderWheel = (
    items: any[],
    selectedValue: any,
    ref: React.RefObject<HTMLDivElement>,
    setter: (value: any) => void,
    formatter?: (item: any) => string
  ) => (
    <div className="relative h-[200px] overflow-hidden rounded-lg bg-white/5 border border-emerald-500/20">
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[40px] bg-emerald-500/20 border-y-2 border-emerald-500/50 pointer-events-none z-10" />
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-slate-900 via-slate-900/80 to-transparent pointer-events-none z-20" />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent pointer-events-none z-20" />
      
      <div
        ref={ref}
        onScroll={() => handleScroll(ref, items, setter)}
        onWheel={(e) => handleWheel(e, ref, items, selectedValue, setter)}
        className="h-full overflow-y-scroll scrollbar-hide snap-y snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="h-[80px]" />
        {items.map((item, index) => (
          <div
            key={index}
            className={`h-[40px] flex items-center justify-center text-xl font-semibold transition-all snap-center cursor-pointer ${
              item === selectedValue ? 'text-emerald-400 scale-110' : 'text-white/30 scale-90 hover:text-white/50'
            }`}
            onClick={() => {
              setter(item);
              if (ref.current) {
                ref.current.scrollTop = index * 40;
              }
            }}
          >
            {formatter ? formatter(item) : item}
          </div>
        ))}
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
      {/* Manual Time Input with Dropdowns */}
      <div className="bg-white/5 border border-emerald-500/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span className="text-sm text-emerald-300 font-medium">Select Time</span>
        </div>
        
        <div className="grid grid-cols-7 gap-3 items-center">
          {/* Hour Input with Dropdown */}
          <div className="col-span-2 relative" ref={hourDropdownRef}>
            <div className="relative">
              <input
                type="text"
                value={hourInputValue}
                onChange={handleHourInputChange}
                onBlur={handleHourBlur}
                onFocus={(e) => {
                  setShowHourDropdown(true);
                  e.target.select(); // Select all text on focus for easy replacement
                }}
                maxLength={2}
                className="w-full px-3 py-2.5 pr-8 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-center text-base font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50"
                placeholder="HH"
              />
              <button
                type="button"
                onClick={() => setShowHourDropdown(!showHourDropdown)}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded transition-colors"
              >
                <ChevronDown className="w-4 h-4 text-emerald-400" />
              </button>
            </div>
            {showHourDropdown && (
              <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-slate-800 border border-emerald-500/30 rounded-lg shadow-xl scrollbar-hide">
                {hours.map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleHourSelect(h)}
                    className={`w-full px-3 py-2 text-center hover:bg-emerald-500/20 transition-colors ${
                      h === selectedHour ? 'bg-emerald-500/30 text-emerald-300 font-semibold' : 'text-white'
                    }`}
                  >
                    {h.toString().padStart(2, '0')}
                  </button>
                ))}
              </div>
            )}
            <div className="text-xs text-emerald-300/70 text-center mt-1">Hour</div>
          </div>

          {/* Separator */}
          <div className="text-2xl text-emerald-400 font-bold text-center">:</div>

          {/* Minute Input with Dropdown */}
          <div className="col-span-2 relative" ref={minuteDropdownRef}>
            <div className="relative">
              <input
                type="text"
                value={minuteInputValue}
                onChange={handleMinuteInputChange}
                onBlur={handleMinuteBlur}
                onFocus={(e) => {
                  setShowMinuteDropdown(true);
                  e.target.select(); // Select all text on focus for easy replacement
                }}
                maxLength={2}
                className="w-full px-3 py-2.5 pr-8 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-center text-base font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50"
                placeholder="MM"
              />
              <button
                type="button"
                onClick={() => setShowMinuteDropdown(!showMinuteDropdown)}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded transition-colors"
              >
                <ChevronDown className="w-4 h-4 text-emerald-400" />
              </button>
            </div>
            {showMinuteDropdown && (
              <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-slate-800 border border-emerald-500/30 rounded-lg shadow-xl scrollbar-hide">
                {minutes.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleMinuteSelect(m)}
                    className={`w-full px-3 py-2 text-center hover:bg-emerald-500/20 transition-colors ${
                      m === selectedMinute ? 'bg-emerald-500/30 text-emerald-300 font-semibold' : 'text-white'
                    }`}
                  >
                    {m.toString().padStart(2, '0')}
                  </button>
                ))}
              </div>
            )}
            <div className="text-xs text-emerald-300/70 text-center mt-1">Minute</div>
          </div>

          {/* AM/PM Buttons */}
          <div className="col-span-2 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setSelectedPeriod('AM')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                selectedPeriod === 'AM'
                  ? 'bg-emerald-500/30 border-2 border-emerald-500 text-emerald-300'
                  : 'bg-white/5 border border-emerald-500/20 text-white/60 hover:bg-white/10'
              }`}
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => setSelectedPeriod('PM')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                selectedPeriod === 'PM'
                  ? 'bg-emerald-500/30 border-2 border-emerald-500 text-emerald-300'
                  : 'bg-white/5 border border-emerald-500/20 text-white/60 hover:bg-white/10'
              }`}
            >
              PM
            </button>
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
            <div>
              <div className="text-center text-xs text-emerald-300/70 mb-2 font-medium">Hour</div>
              {renderWheel(hours, selectedHour, hourRef, setSelectedHour, (h) => h.toString().padStart(2, '0'))}
            </div>
            <div>
              <div className="text-center text-xs text-emerald-300/70 mb-2 font-medium">Min</div>
              {renderWheel(minutes, selectedMinute, minuteRef, setSelectedMinute, (m) => m.toString().padStart(2, '0'))}
            </div>
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
