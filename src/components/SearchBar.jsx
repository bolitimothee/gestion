import React, { useState, useEffect, useCallback } from 'react';
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
  }, [debouncedSearchTerm, selectedFilter]);

  const handleClear = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setSelectedFilter('');
    if (onSearch) {
      onSearch('', '');
    }
  }, []);

  const handleFilterSelect = useCallback((filterValue) => {
    setSelectedFilter(filterValue);
    setShowFilterDropdown(false);
    if (onFilter) {
      onFilter(filterValue);
    }
  }, []);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      setDebouncedSearchTerm(e.target.value);
      if (onSearch) {
        onSearch(e.target.value, selectedFilter);
      }
    }
  }, []);

  return (
    <div className={`search-bar ${className}`}>
      <div className="search-input-container">
        <Search className="search-icon" size={20} />
        <input
          type="text"
          className="search-input"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyPress}
        />
        {(searchTerm || selectedFilter) && (
          <button
            className="search-clear-btn"
            onClick={handleClear}
            title="Effacer la recherche"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {showFilters && filters.length > 0 && (
        <div className="search-filter-container">
          <button
            className={`search-filter-btn ${selectedFilter ? 'active' : ''}`}
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            title="Filtrer les résultats"
          >
            <Filter size={16} />
            {selectedFilter && (
              <span className="filter-label">
                {filters.find(f => f.value === selectedFilter)?.label || selectedFilter}
              </span>
            )}
          </button>

          {showFilterDropdown && (
            <div className="search-filter-dropdown">
              <div className="filter-header">
                <h4>Filtrer par</h4>
              </div>
              <div className="filter-options">
                <button
                  className={`filter-option ${!selectedFilter ? 'active' : ''}`}
                  onClick={() => handleFilterSelect('')}
                >
                  Tous
                </button>
                {filters.map((filter) => (
                  <button
                    key={filter.value}
                    className={`filter-option ${selectedFilter === filter.value ? 'active' : ''}`}
                    onClick={() => handleFilterSelect(filter.value)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Close dropdown when clicking outside */}
      {showFilterDropdown && (
        <div
          className="search-overlay"
          onClick={() => setShowFilterDropdown(false)}
        />
      )}
    </div>
  );
}
