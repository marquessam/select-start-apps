import React, { useState, useEffect } from 'react';

interface Nomination {
  game: string;
  platform: string;
  discordUsername: string;
  discordId: string;
}

interface NominationsData {
  _id: string;
  nominations: Nomination[];
  isOpen: boolean;
  lastUpdated: string;
}

const platformFullNames: { [key: string]: string } = {
  'NES': 'Nintendo Entertainment System',
  'SNES': 'Super Nintendo',
  'GB': 'Nintendo Game Boy',
  'GBC': 'Nintendo Game Boy Color',
  'GBA': 'Nintendo Game Boy Advance',
  'N64': 'Nintendo 64',
  'GENESIS': 'Sega Genesis',
  'MASTER SYSTEM': 'Sega Master System',
  'GAME GEAR': 'Sega Game Gear',
  'PSX': 'Sony PlayStation',
  'SATURN': 'Sega Saturn',
  'NEO GEO': 'SNK Neo Geo',
  'TURBOGRAFX-16': 'TurboGrafx-16'
};

const platformOrder = [
  'NES', 'SNES', 'GENESIS', 'N64', 'PSX', 'GB', 'GBC', 'GBA',
  'SATURN', 'MASTER SYSTEM', 'GAME GEAR', 'NEO GEO', 'TURBOGRAFX-16'
];

const Nominations = () => {
  const [data, setData] = useState<NominationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/nominations');
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch nominations: ${response.status} ${response.statusText}`);
      }
      
      const newData = await response.json();
      console.log('Raw nominations data:', newData);
      
      if (!newData || !Array.isArray(newData.nominations)) {
        throw new Error('Invalid data structure received from API');
      }
      
      setData(newData);
      setError(null);
    } catch (err) {
      console.error('Error fetching nominations:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="p-4 text-white">Loading nominations...</div>;
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-500">Error loading nominations: {error}</div>
        <button 
          onClick={fetchData}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data || !data.nominations || data.nominations.length === 0) {
    return (
      <div className="p-4 text-white">
        No nominations found.
      </div>
    );
  }

  const groupedNominations = data.nominations.reduce((acc, nom) => {
    if (!acc[nom.platform]) acc[nom.platform] = [];
    acc[nom.platform].push(nom);
    return acc;
  }, {} as Record<string, Nomination[]>);

  Object.values(groupedNominations).forEach(nominations => {
    nominations.sort((a, b) => a.game.localeCompare(b.game));
  });

  return (
    <div id="nominations-content" style={{ backgroundColor: '#17254A' }}>
      <div className="mx-auto" style={{ maxWidth: '1200px' }}>
        <div style={{ 
          padding: '12px 16px', 
          borderBottom: '1px solid #2a3a6a',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span role="img" aria-label="game controller" style={{ fontSize: '1.5rem' }}>🎮</span>
          <h2 style={{ 
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: 'white',
            margin: 0
          }}>Game Nominations</h2>
          {!data.isOpen && (
            <span style={{
              marginLeft: 'auto',
              color: '#ff4444',
              fontSize: '0.875rem'
            }}>
              Nominations are currently closed
            </span>
          )}
        </div>

        <div style={{ padding: '16px' }}>
          {platformOrder
            .filter(platform => groupedNominations[platform])
            .map((platform) => (
              <div key={platform} style={{ marginBottom: '16px' }}>
                <div style={{ 
                  backgroundColor: '#2a3a6a',
                  padding: '12px 16px',
                  marginBottom: '1px'
                }}>
                  <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: 'bold',
                    color: 'white',
                    margin: 0
                  }}>{platformFullNames[platform] || platform}</h3>
                </div>
                {groupedNominations[platform].map((nom, index) => (
                  <div 
                    key={`${nom.game}-${index}`}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#1f2b4d',
                      color: 'white',
                      display: 'flex',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}
                  >
                    <span style={{ fontWeight: '500' }}>{nom.game}</span>
                    <span style={{ 
                      color: '#32CD32',
                      fontSize: '0.875rem'
                    }}>nominated by {nom.discordUsername}</span>
                  </div>
                ))}
              </div>
            ))}
        </div>

        <div style={{
          textAlign: 'center',
          fontSize: '0.875rem',
          color: '#8892b0',
          padding: '16px',
          borderTop: '1px solid #2a3a6a',
          marginTop: '16px'
        }}>
          Last updated: {new Date(data.lastUpdated).toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default Nominations;
