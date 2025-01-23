import React, { useState, useEffect } from 'react';

interface Nomination {
  game: string;
  platform: string;
  discordUsername: string;
  discordId: string;
}

interface NominationsData {
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
  'NES',
  'SNES',
  'GENESIS',
  'N64',
  'PSX',
  'GB',
  'GBC',
  'GBA',
  'SATURN',
  'MASTER SYSTEM',
  'GAME GEAR',
  'NEO GEO',
  'TURBOGRAFX-16'
];

const Nominations = () => {
  const [data, setData] = useState<NominationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function sendHeight() {
      const content = document.getElementById('nominations-content');
      if (content) {
        // Get the actual full height of all content
        const fullHeight = Array.from(content.children)
          .reduce((total, child) => total + child.scrollHeight, 0);
        
        // Add extra padding to ensure everything is visible
        const heightWithPadding = fullHeight + 100;
        
        window.parent.postMessage({
          type: 'resize',
          height: heightWithPadding
        }, '*');

        // Send height again after a brief delay to ensure all content is rendered
        setTimeout(() => {
          window.parent.postMessage({
            type: 'resize',
            height: heightWithPadding
          }, '*');
        }, 500);
      }
    }

    // Send height after content updates with a delay to ensure rendering
    if (data) {
      setTimeout(sendHeight, 100);
      // Send height again after a longer delay to catch any late updates
      setTimeout(sendHeight, 1000);
    }
  }, [data]);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/nominations');
      if (!response.ok) throw new Error('Failed to fetch nominations');
      const newData = await response.json();
      setData(newData);
      setError(null);
    } catch (err) {
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

  if (loading) return <div className="p-4 text-white">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
  if (!data) return null;

  const groupedNominations = data.nominations.reduce((acc, nom) => {
    if (!acc[nom.platform]) acc[nom.platform] = [];
    acc[nom.platform].push(nom);
    return acc;
  }, {} as Record<string, Nomination[]>);

  // Sort games alphabetically within each platform
  Object.values(groupedNominations).forEach(nominations => {
    nominations.sort((a, b) => a.game.localeCompare(b.game));
  });

  return (
    <div id="nominations-content" style={{ backgroundColor: '#17254A', color: 'white' }}>
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
          margin: 0
        }}>Game Nominations</h2>
      </div>

      <div>
        {platformOrder
          .filter(platform => groupedNominations[platform])
          .map((platform) => (
            <div key={platform} style={{ marginBottom: '2px' }}>
              <div style={{ 
                backgroundColor: '#2a3a6a',
                padding: '12px 16px'
              }}>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: 'bold',
                  margin: 0
                }}>{platformFullNames[platform] || platform}</h3>
              </div>
              {groupedNominations[platform].map((nom, index) => (
                <div 
                  key={`${nom.game}-${index}`}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#1f2b4d',
                    display: 'flex',
                    flexDirection: window.innerWidth < 768 ? 'column' : 'row',
                    justifyContent: 'space-between',
                    alignItems: window.innerWidth < 768 ? 'flex-start' : 'center'
                  }}
                >
                  <span style={{ fontWeight: '500' }}>{nom.game}</span>
                  <span style={{ 
                    color: '#32CD32',
                    fontSize: '0.875rem',
                    marginTop: window.innerWidth < 768 ? '4px' : '0'
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
  );
};

export default Nominations;
