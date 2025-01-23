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
        const height = content.clientHeight;
        window.parent.postMessage({
          type: 'resize',
          height
        }, '*');
      }
    }

    // Send height after content updates
    setTimeout(sendHeight, 0);
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

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
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
    <div id="nominations-content" className="bg-[#17254A] text-white">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2a3a6a]">
        <span className="text-xl">🎮</span>
        <h2 className="text-xl font-bold">Game Nominations</h2>
      </div>

      <div>
        {platformOrder
          .filter(platform => groupedNominations[platform])
          .map((platform) => (
            <div key={platform} className="mb-4">
              <div className="bg-[#2a3a6a] px-4 py-2">
                <h3 className="text-lg font-semibold">{platformFullNames[platform] || platform}</h3>
              </div>
              {groupedNominations[platform].map((nom, index) => (
                <div 
                  key={`${nom.game}-${index}`}
                  className="flex flex-col md:flex-row md:justify-between px-4 py-2 bg-[#1f2b4d]"
                >
                  <span className="font-medium">{nom.game}</span>
                  <span className="text-[#32CD32] text-sm md:ml-4">
                    nominated by {nom.discordUsername}
                  </span>
                </div>
              ))}
            </div>
          ))}
      </div>

      {data.nominations.length > 0 && (
        <div className="text-sm text-center text-gray-400 mt-4 pt-4 border-t border-[#2a3a6a]">
          Last updated: {new Date(data.lastUpdated).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default Nominations;
