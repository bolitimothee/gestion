import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Filter } from 'lucide-react';
import './SearchBar.css';

export default function SearchBar({
  placeholder = "Rechercher...",
  onSearch,
  onFilter,
  filters = [],
  showFilters = false,
  className = ""
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const inputRef = useRef(null);
  const filterDropdownRef = useRef(null);

  // Detect PWA mode
  useEffect(() => {
    const checkPWA = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebApp = window.navigator.standalone !== undefined;
      setIsPWA(isStandalone || isInWebApp);
    };

    checkPWA();
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkPWA);
    return () => window.matchMedia('(display-mode: standalone)').removeEventListener('change', checkPWA);
  }, []);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Trigger search when debounced term changes
  useEffect(() => {
    if (onSearch) {
      onSearch(debouncedSearchTerm, selectedFilter);
    }
  }, [debouncedSearchTerm, selectedFilter, onSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    };

    if (showFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside, { passive: true });
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showFilterDropdown]);

  // Handle Escape key to close dropdown
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowFilterDropdown(false);
        if (inputRef.current) {
          inputRef.current.blur();
        }
      }
    };

    if (showFilterDropdown) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showFilterDropdown]);

  // Prevent scroll when dropdown is open on mobile
  useEffect(() => {
    if (showFilterDropdown && window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';

      return () => {
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
      };
    }
  }, [showFilterDropdown]);

  const handleClear = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setSelectedFilter('');
    setShowFilterDropdown(false);
    if (onSearch) {
      onSearch('', '');
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [onSearch]);

  const handleFilterSelect = useCallback((filterValue) => {
    setSelectedFilter(filterValue);
    setShowFilterDropdown(false);

    if (onFilter) {
      onFilter(filterValue);
    }

    if (onSearch) {
      onSearch(searchTerm, filterValue);
    }

    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [onFilter, onSearch, searchTerm]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setDebouncedSearchTerm(e.target.value);
      if (onSearch) {
        onSearch(e.target.value, selectedFilter);
      }
      if (inputRef.current) {
        inputRef.current.blur();
      }
    } else if (e.key === 'Escape') {
      setShowFilterDropdown(false);
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }
  }, [onSearch, selectedFilter]);

  const handleInputChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleInputFocus = useCallback(() => {
    setShowFilterDropdown(false);
  }, []);

  const toggleFilterDropdown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowFilterDropdown(prev => !prev);
  }, []);

  return (
    <div className={`search-bar ${className} ${isPWA ? 'pwa-mode' : ''}`}>
      <div className="search-input-container">
        <Search className="search-icon" size={18} />
        <input
          ref={inputRef}
          type="search"
          className="search-input"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck="false"
          enterKeyHint="search"
          inputMode="search"
        />
        {(searchTerm || selectedFilter) && (
          <button
            className="search-clear-btn"
            onClick={handleClear}
            title="Effacer la recherche"
            type="button"
            aria-label="Effacer la recherche"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {showFilters && filters.length > 0 && (
        <div className="search-filter-container" ref={filterDropdownRef}>
          <button
            className={`search-filter-btn ${selectedFilter ? 'active' : ''}`}
            onClick={toggleFilterDropdown}
            onMouseDown={(e) => e.preventDefault()}
            title="Filtrer les résultats"
            type="button"
            aria-label="Filtrer les résultats"
            aria-expanded={showFilterDropdown}
            aria-haspopup="menu"
          >
            <Filter size={16} />
            {selectedFilter && (
              <span className="filter-label">
                {filters.find(f => f.value === selectedFilter)?.label || selectedFilter}
              </span>
            )}
          </button>

          {showFilterDropdown && (
            <>
              <div
                className="search-overlay"
                onClick={() => setShowFilterDropdown(false)}
              />
              <div
                className="search-filter-dropdown"
                role="menu"
                aria-label="Options de filtre"
              >
                <div className="filter-header">
                  <h4>Filtrer par</h4>
                </div>
                <div className="filter-options">
                  <button
                    className={`filter-option ${!selectedFilter ? 'active' : ''}`}
                    onClick={() => handleFilterSelect('')}
                    type="button"
                    role="menuitem"
                  >
                    Tous
                  </button>
                  {filters.map((filter) => (
                    <button
                      key={filter.value}
                      className={`filter-option ${selectedFilter === filter.value ? 'active' : ''}`}
                      onClick={() => handleFilterSelect(filter.value)}
                      type="button"
                      role="menuitem"
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}