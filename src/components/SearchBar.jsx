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
  const inputRef = useRef(null);
  const filterDropdownRef = useRef(null);

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
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showFilterDropdown]);

  // Handle Escape key to close dropdown
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowFilterDropdown(false);
        if (inputRef.current) {
          inputRef.current.blur();
        }
      }
    };

    if (showFilterDropdown) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
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
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [onFilter]);

  const handleKeyPress = useCallback((e) => {
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
    // Close filter dropdown when input is focused
    setShowFilterDropdown(false);
  }, []);

  return (
    <div className={`search-bar ${className}`}>
      <div className="search-input-container">
        <Search className="search-icon" size={20} />
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          onFocus={handleInputFocus}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck="false"
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
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            title="Filtrer les résultats"
            type="button"
            aria-label="Filtrer les résultats"
            aria-expanded={showFilterDropdown}
          >
            <Filter size={16} />
            {selectedFilter && (
              <span className="filter-label">
                {filters.find(f => f.value === selectedFilter)?.label || selectedFilter}
              </span>
            )}
          </button>

          {showFilterDropdown && (
            <div className="search-filter-dropdown" role="menu">
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
          )}
        </div>
      )}
    </div>
  );
}
