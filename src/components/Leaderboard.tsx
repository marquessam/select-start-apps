import React, { useState, useEffect } from 'react';

interface LeaderboardEntry {
  username: string;
  profileImage: string;
  profileUrl: string;
  completedAchievements?: number;
  totalAchievements?: number;
  completionPercentage?: number;
  hasBeatenGame?: boolean;
  points?: number;
}

interface GameInfo {
  Title: string;
  ImageIcon: string;
}

interface LeaderboardData {
  gameInfo?: GameInfo;
  leaderboard: LeaderboardEntry[];
  additionalParticipants: string[];
  lastUpdated: string;
}

const Leaderboard = () => {
  const [activeTab, setActiveTab] = useState('monthly');
  const [monthlyData, setMonthlyData] = useState<LeaderboardData | null>(null);
  const [yearlyData, setYearlyData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function sendHeight() {
      const content = document.getElementById('leaderboard-content');
      if (content) {
        // Calculate actual content height
        const contentHeight = content.scrollHeight;
        window.parent.postMessage({
          type: 'resize',
          height: contentHeight + 20 // Small padding to prevent cutting off
        }, '*');
      }
    }

    // Send height after data/tab changes
    if (monthlyData || yearlyData) {
      // Small delay to ensure content is rendered
      setTimeout(sendHeight, 100);
    }
  }, [monthlyData, yearlyData, activeTab]);

  const fetchData = async () => {
    try {
      const [monthlyResponse, yearlyResponse] = await Promise.all([
        fetch('/api/monthly-leaderboard'),
        fetch('/api/yearly-leaderboard')
      ]);
      
      if (!monthlyResponse.ok || !yearlyResponse.ok) throw new Error('Failed to fetch data');
      
      const monthlyData = await monthlyResponse.json();
      const yearlyData = await yearlyResponse.json();
      
      setMonthlyData(monthlyData);
      setYearlyData(yearlyData);
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
  if (!monthlyData || !yearlyData) return null;

  const currentData = activeTab === 'monthly' ? monthlyData : yearlyData;

return (
    <div id="nominations-content" style={{ 
      backgroundColor: '#17254A',
      color: 'white',
      minHeight: '100vh' // Ensure it takes full height
    }}>
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
                    backgroundColor: '#1f2b4d'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <span style={{ fontWeight: '500' }}>{nom.game}</span>
                    <span style={{ 
                      color: '#32CD32',
                      fontSize: '0.875rem'
                    }}>nominated by {nom.discordUsername}</span>
                  </div>
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
