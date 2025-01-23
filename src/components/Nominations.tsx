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

// Define platform order by generation
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

const Nominations = () => {
  const [data, setData] = useState<NominationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Single resize handler function
  const sendHeight = () => {
    const height = document.documentElement.scrollHeight;
    window.parent.postMessage({
      type: 'resize',
      height
    }, '*');
  };

  // Data fetching effect
  useEffect(() => {
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

    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  // Resize effect
  useEffect(() => {
    // Initial resize
    const timeoutId = setTimeout(sendHeight, 100);

    // Window resize listener
    window.addEventListener('resize', sendHeight);

    return () => {
      window.removeEventListener('resize', sendHeight);
      clearTimeout(timeoutId);
    };
  }, [data]);

  if (loading) return <div className="text-center py-4">Loading...</div>;
  if (error) return <div className="text-center py-4 text-red-500">Error: {error}</div>;
  if (!data) return null;

  const groupedNominations = data.nominations.reduce((acc, nom) => {
    if (!acc[nom.platform]) acc[nom.platform] = [];
    acc[nom.platform].push(nom);
    return acc;
  }, {} as Record<string, Nomination[]>);

  return (
    <div className="bg-[#17254A] min-h-screen">
      <div className="px-4 py-3">
        <h2 className="text-xl font-bold text-center flex items-center justify-center gap-2">
          <span>🎮</span>
          <span>Game Nominations</span>
        </h2>
      </div>
      
      <div className="px-4">
        {Object.entries(groupedNominations).length === 0 ? (
          <div className="text-center py-4">
            No nominations for the current period
          </div>
        ) : (
          <>
            {platformOrder
              .filter(platform => groupedNominations[platform])
              .map((platform) => (
                <div key={platform} className="nomination-section mb-4">
                  <h3 className="text-lg font-bold px-4 py-2 bg-[#2a3a6a] rounded-t-md">
                    {platformFullNames[platform] || platform}
                  </h3>
                  <div className="nomination-entries">
                    {groupedNominations[platform].map((nom, index) => (
                      <div 
                        key={`${nom.game}-${index}`} 
                        className="nomination-entry px-4 py-2 bg-[#1c2d57] even:bg-[#1f325f]"
                      >
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                          <span className="font-medium">{nom.game}</span>
                          <span className="nominated-by text-sm">
                            nominated by {nom.discordUsername}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            }
          </>
        )}

        <div className="text-sm text-center text-slate-400 py-4 mt-4 border-t border-[#2a3a6a]">
          Last updated: {new Date(data.lastUpdated).toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default Nominations;
