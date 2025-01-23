import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

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
    <Card className="w-full max-w-4xl bg-gray-900 text-gray-100 border-gray-700">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-center">
          Game Nominations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 px-4 py-2 bg-gray-800 rounded-md">
          <div className="flex justify-between items-center">
            <span>Status:</span>
            <span className={`px-2 py-1 rounded ${
              data.isOpen 
                ? 'bg-green-600 text-white' 
                : 'bg-red-600 text-white'
            }`}>
              {data.isOpen ? 'OPEN' : 'CLOSED'}
            </span>
          </div>
        </div>

        {Object.entries(groupedNominations).length === 0 ? (
          <div className="text-center py-4 text-gray-400">
            No nominations for the current period
          </div>
        ) : (
          Object.entries(groupedNominations)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([platform, nominations]) => (
              <div key={platform} className="mb-6">
                <h3 className="text-lg font-semibold mb-2 px-2 py-1 bg-gray-800">
                  {platform}
                </h3>
                <div className="space-y-2">
                  {nominations.map((nom, index) => (
                    <div 
                      key={`${nom.game}-${index}`}
                      className="flex items-center px-4 py-2 bg-gray-800/50 rounded-md hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex-grow">
                        <span className="font-medium">{nom.game}</span>
                        <span className="text-gray-400 text-sm ml-2">
                          nominated by {nom.discordUsername}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
        )}

        <div className="mt-6 text-gray-400 text-sm text-center">
          Last updated: {new Date(data.lastUpdated).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
};

export default Nominations;
