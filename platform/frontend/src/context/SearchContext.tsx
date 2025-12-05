import React, { createContext, useContext, useState } from 'react';

interface SearchContextValue {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredCount: number;
  setFilteredCount: (count: number) => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCount, setFilteredCount] = useState(0);

  return (
    <SearchContext.Provider value={{ searchTerm, setSearchTerm, filteredCount, setFilteredCount }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}

