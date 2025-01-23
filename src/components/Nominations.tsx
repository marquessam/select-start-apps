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
    const interval = setInterval(fetchData, 300000); // Refresh every 5 minutes
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
    <div className="w-full max-w-4xl bg-slate-900 text-gray-100 border border-slate-700 rounded-lg shadow-lg">
      <div className="px-6 py-4 border-b border-slate-700">
        <h2 className="text-2xl font-bold text-center">
          🎮 Game Nominations
        </h2>
      </div>
      
      <div className="p-6 space-y-8">
        {Object.entries(groupedNominations).length === 0 ? (
          <div className="text-center py-4 text-gray-400">
            No nominations for the current period
          </div>
        ) : (
          Object.entries(groupedNominations)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([platform, nominations]) => (
              <div key={platform} className="bg-slate-800/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 px-3 py-2 bg-slate-800 rounded-md text-slate-100">
                  {platformFullNames[platform] || platform}
                </h3>
                <div className="space-y-3">
                  {nominations.map((nom, index) => (
                    <div 
                      key={`${nom.game}-${index}`}
                      className="px-4 py-2 bg-slate-800/30 rounded-md hover:bg-slate-800 transition-colors"
                    >
                      <div>
                        <span className="font-medium">{nom.game}</span>{' '}
                        <span className="text-emerald-400">
                          nominated by {nom.discordUsername}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
        )}

        <div className="mt-6 text-slate-400 text-sm text-center">
          Last updated: {new Date(data.lastUpdated).toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default Nominations;
