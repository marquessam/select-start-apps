import React, { useState, useEffect } from 'react';

interface Nomination {
  gameId: string;
  game?: string;
  platform?: string;
  nominatedBy: string;
  nominatedAt?: Date;
}

interface NominationsData {
  nominations: Nomination[];
  lastUpdated: string;
  isOpen?: boolean;
}

// Platform name mappings for display
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

// Platform display order
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
      
      const rawData = await response.json();
      console.log('Raw nominations data:', rawData);
      
      // Format to match the expected structure
      const formattedData: NominationsData = {
        nominations: rawData.nominations.map((nom: any) => ({
          gameId: nom.gameId,
          game: nom.game || nom.title || nom.gameTitle || `Game ${nom.gameId}`,
          platform: nom.platform || nom.consoleName || 'Unknown',
          nominatedBy: nom.nominatedBy || nom.raUsername || nom.username || 'Unknown User',
          nominatedAt: nom.nominatedAt ? new Date(nom.nominatedAt) : undefined
        })),
        lastUpdated: rawData.lastUpdated || new Date().toISOString(),
        isOpen: rawData.isOpen !== undefined ? rawData.isOpen : true
      };
      
      setData(formattedData);
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
    const interval = setInterval(fetchData, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  // Update container height for iframe resizing
  useEffect(() => {
    const updateHeight = () => {
      const content = document.getElementById('nominations-content');
      if (content && window.parent !== window) {
        window.parent.postMessage({
          type: 'resize',
          height: content.getBoundingClientRect().height
        }, '*');
      }
    };

    if (!loading && data) {
      // Update height after render completes
      setTimeout(updateHeight, 100);
    }
  }, [loading, data]);

  if (loading) {
    return <div id="nominations-content" className="p-4 text-white" style={{ backgroundColor: '#17254A' }}>Loading nominations...</div>;
  }

  if (error) {
    return (
      <div id="nominations-content" className="p-4" style={{ backgroundColor: '#17254A' }}>
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
      <div id="nominations-content" className="p-4 text-white" style={{ backgroundColor: '#17254A' }}>
        No nominations found.
      </div>
    );
  }

  // Group nominations by platform
  const groupedNominations = data.nominations.reduce((acc, nom) => {
    const platform = nom.platform || 'Unknown';
    if (!acc[platform]) acc[platform] = [];
    acc[platform].push(nom);
    return acc;
  }, {} as Record<string, Nomination[]>);

  // Sort nominations alphabetically within each platform
  Object.values(groupedNominations).forEach(nominations => {
    nominations.sort((a, b) => (a.game || '').localeCompare(b.game || ''));
  });

  // Get current month and year for display
  const now = new Date();
  const monthName = now.toLocaleString('default', { month: 'long' });

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
          }}>{monthName} Game Nominations</h2>
          {data.isOpen === false && (
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
          {/* First display platforms in the specified order */}
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
                    key={`${nom.gameId}-${index}`}
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
                    }}>nominated by {nom.nominatedBy}</span>
                  </div>
                ))}
              </div>
            ))}
          
          {/* Then display any remaining platforms not in the order list */}
          {Object.keys(groupedNominations)
            .filter(platform => !platformOrder.includes(platform))
            .sort()
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
                    key={`${nom.gameId}-${index}`}
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
                    }}>nominated by {nom.nominatedBy}</span>
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
