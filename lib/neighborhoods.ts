// lib/neighborhoods.ts
export interface Neighborhood {
  id: string;
  name: string;
  category: 'boston' | 'cambridge' | 'brookline' | 'other';
}

// Boston area neighborhoods from the neighborhoods.txt file
export const BOSTON_NEIGHBORHOODS: Neighborhood[] = [
  // Boston neighborhoods
  { id: 'boston-allston', name: 'Boston - Allston', category: 'boston' },
  { id: 'boston-back-bay', name: 'Boston - Back Bay', category: 'boston' },
  { id: 'boston-bay-village', name: 'Boston - Bay Village', category: 'boston' },
  { id: 'boston-beacon-hill', name: 'Boston - Beacon Hill', category: 'boston' },
  { id: 'boston-brighton', name: 'Boston - Brighton', category: 'boston' },
  { id: 'boston-charlestown', name: 'Boston - Charlestown', category: 'boston' },
  { id: 'boston-chinatown', name: 'Boston - Chinatown', category: 'boston' },
  { id: 'boston-dorchester', name: 'Boston - Dorchester', category: 'boston' },
  { id: 'boston-east-boston', name: 'Boston - East Boston', category: 'boston' },
  { id: 'boston-fenway', name: 'Boston - Fenway', category: 'boston' },
  { id: 'boston-financial-district', name: 'Boston - Financial District', category: 'boston' },
  { id: 'boston-fort-hill', name: 'Boston - Fort Hill', category: 'boston' },
  { id: 'boston-hyde-park', name: 'Boston - Hyde Park', category: 'boston' },
  { id: 'boston-jamaica-plain', name: 'Boston - Jamaica Plain', category: 'boston' },
  { id: 'boston-kenmore', name: 'Boston - Kenmore', category: 'boston' },
  { id: 'boston-leather-district', name: 'Boston - Leather District', category: 'boston' },
  { id: 'boston-mattapan', name: 'Boston - Mattapan', category: 'boston' },
  { id: 'boston-midtown', name: 'Boston - Midtown', category: 'boston' },
  { id: 'boston-mission-hill', name: 'Boston - Mission Hill', category: 'boston' },
  { id: 'boston-north-end', name: 'Boston - North End', category: 'boston' },
  { id: 'boston-roslindale', name: 'Boston - Roslindale', category: 'boston' },
  { id: 'boston-roxbury', name: 'Boston - Roxbury', category: 'boston' },
  { id: 'boston-seaport-district', name: 'Boston - Seaport District', category: 'boston' },
  { id: 'boston-south-boston', name: 'Boston - South Boston', category: 'boston' },
  { id: 'boston-south-end', name: 'Boston - South End', category: 'boston' },
  { id: 'boston-theatre-district', name: 'Boston - Theatre District', category: 'boston' },
  { id: 'boston-waterfront', name: 'Boston - Waterfront', category: 'boston' },
  { id: 'boston-west-end', name: 'Boston - West End', category: 'boston' },
  { id: 'boston-west-roxbury', name: 'Boston - West Roxbury', category: 'boston' },

  // Cambridge neighborhoods
  { id: 'cambridge-agassiz', name: 'Cambridge - Agassiz', category: 'cambridge' },
  { id: 'cambridge-cambridge-highlands', name: 'Cambridge - Cambridge Highlands', category: 'cambridge' },
  { id: 'cambridge-cambridgeport', name: 'Cambridge - Cambridgeport', category: 'cambridge' },
  { id: 'cambridge-central-square', name: 'Cambridge - Central Square', category: 'cambridge' },
  { id: 'cambridge-east-cambridge', name: 'Cambridge - East Cambridge', category: 'cambridge' },
  { id: 'cambridge-harvard-square', name: 'Cambridge - Harvard Square', category: 'cambridge' },
  { id: 'cambridge-huron-village', name: 'Cambridge - Huron Village', category: 'cambridge' },
  { id: 'cambridge-inman-square', name: 'Cambridge - Inman Square', category: 'cambridge' },
  { id: 'cambridge-kendall-square', name: 'Cambridge - Kendall Square', category: 'cambridge' },
  { id: 'cambridge-mid-cambridge', name: 'Cambridge - Mid Cambridge', category: 'cambridge' },
  { id: 'cambridge-neighborhood-nine', name: 'Cambridge - Neighborhood Nine', category: 'cambridge' },
  { id: 'cambridge-north-cambridge', name: 'Cambridge - North Cambridge', category: 'cambridge' },
  { id: 'cambridge-porter-square', name: 'Cambridge - Porter Square', category: 'cambridge' },
  { id: 'cambridge-riverside', name: 'Cambridge - Riverside', category: 'cambridge' },
  { id: 'cambridge-wellington-harrington', name: 'Cambridge - Wellington-Harrington', category: 'cambridge' },
  { id: 'cambridge-west-cambridge', name: 'Cambridge - West Cambridge', category: 'cambridge' },

  // Brookline neighborhoods
  { id: 'brookline', name: 'Brookline', category: 'brookline' },
  { id: 'brookline-brookline-village', name: 'Brookline - Brookline Village', category: 'brookline' },
  { id: 'brookline-coolidge-corner', name: 'Brookline - Coolidge Corner', category: 'brookline' },
  { id: 'brookline-longwood', name: 'Brookline - Longwood', category: 'brookline' },
  { id: 'brookline-reservoir', name: 'Brookline - Reservoir', category: 'brookline' },
  { id: 'brookline-washington-square', name: 'Brookline - Washington Square', category: 'brookline' },

  // Other areas
  { id: 'belmont', name: 'Belmont', category: 'other' },
  { id: 'belmont-payson-park', name: 'Belmont - Payson Park', category: 'other' },
  { id: 'belmont-waverley', name: 'Belmont - Waverley', category: 'other' },
  { id: 'boston', name: 'Boston', category: 'other' },
  { id: 'cambridge', name: 'Cambridge', category: 'other' },
  { id: 'chestnut-hill', name: 'Chestnut Hill', category: 'other' },
];

// Helper function to get neighborhoods by category
export const getNeighborhoodsByCategory = (category: Neighborhood['category']): Neighborhood[] => {
  return BOSTON_NEIGHBORHOODS.filter(neighborhood => neighborhood.category === category);
};

// Helper function to get all neighborhoods
export const getAllNeighborhoods = (): Neighborhood[] => {
  return BOSTON_NEIGHBORHOODS;
};

// Helper function to get neighborhood by ID
export const getNeighborhoodById = (id: string): Neighborhood | undefined => {
  return BOSTON_NEIGHBORHOODS.find(neighborhood => neighborhood.id === id);
};

// Helper function to search neighborhoods by name
export const searchNeighborhoods = (searchTerm: string): Neighborhood[] => {
  if (!searchTerm.trim()) return [];
  const term = searchTerm.toLowerCase().trim();
  return BOSTON_NEIGHBORHOODS.filter(neighborhood =>
    neighborhood.name.toLowerCase().includes(term)
  );
};

// Helper function to get neighborhood display name
export const getNeighborhoodDisplayName = (neighborhoodName: string): string => {
  if (!neighborhoodName) return '';
  const neighborhood = BOSTON_NEIGHBORHOODS.find(n =>
    n.name.toLowerCase() === neighborhoodName.toLowerCase()
  );
  return neighborhood ? neighborhood.name : neighborhoodName;
};
