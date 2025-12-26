"use client";

import { useEffect, useRef, useState } from "react";
import { CITIES } from "@/lib/cities";

export default function RegionAutocompleteInput({
  value,
  onChange,
  placeholder = "Start typing city name...",
  inputClassName = "",
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredCities, setFilteredCities] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRegionChange = (val) => {
    onChange(val);
    if (val.trim()) {
      const filtered = CITIES.filter((city) =>
        city.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 10);
      setFilteredCities(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredCities([]);
      setShowSuggestions(false);
    }
  };

  const selectCity = (city) => {
    onChange(city);
    setShowSuggestions(false);
    setFilteredCities([]);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => handleRegionChange(e.target.value)}
        onFocus={() => {
          if (value && filteredCities.length > 0) {
            setShowSuggestions(true);
          }
        }}
        className={inputClassName}
        autoComplete="off"
      />
      {showSuggestions && filteredCities.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900/95 backdrop-blur-sm shadow-xl">
          {filteredCities.map((city, index) => (
            <button
              key={index}
              type="button"
              onClick={() => selectCity(city)}
              className="w-full px-4 py-2.5 text-left text-xs md:text-sm text-slate-800 dark:text-slate-200 hover:bg-emerald-500/20 hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors first:rounded-t-lg last:rounded-b-lg border-b border-slate-200 dark:border-white/5 last:border-b-0"
            >
              {city}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
