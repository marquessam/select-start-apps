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

const Nominations = () => {
  const [data, setData] = useState<NominationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) return <div className="text-center py-4">Loading...</div>;
  if (error) return <div className="text-center py-4 text-red-500">Error: {error}</div>;
  if (!data) return null;

  const groupedNominations = data.nominations.reduce((acc, nom) => {
    if (!acc[nom.platform]) acc[nom.platform] = [];
    acc[nom.platform].push(nom);
    return acc;
  }, {} as Record<string, Nomination[]>);

  return (
    <div>
      <div className="px-6 py-4">
        <h2 className="text-2xl font-bold text-center">
          🎮 Game Nominations
        </h2>
      </div>
      
      <div className="px-6">
        {Object.entries(groupedNominations).length === 0 ? (
          <div className="text-center py-4">
            No nominations for the current period
          </div>
        ) : (
          Object.entries(groupedNominations)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([platform, nominations]) => (
              <div key={platform} className="nomination-section">
                <h3 className="text-xl font-bold mb-4">
                  {platformFullNames[platform] || platform}
                </h3>
                <div>
                  {nominations.map((nom, index) => (
                    <div key={`${nom.game}-${index}`} className="nomination-entry">
                      <span className="font-bold">{nom.game}</span>
                      <span className="nominated-by">
                        nominated by {nom.discordUsername}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
        )}

        <div className="last-updated">
          Last updated: {new Date(data.lastUpdated).toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default Nominations;
