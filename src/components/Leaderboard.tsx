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
  const [attempts, setAttempts] = useState(0);

  // Effect for height calculation
  useEffect(() => {
    const sendHeight = () => {
      const content = document.getElementById('leaderboard-container');
      if (content) {
        const height = content.getBoundingClientRect().height;
        window.parent.postMessage({
          type: 'resize',
          height: height
        }, '*');
      }
    };

    if (monthlyData || yearlyData) {
      sendHeight();
    }
  }, [monthlyData, yearlyData, activeTab]);

  // Multiple tab switch attempts
  useEffect(() => {
    if (monthlyData && yearlyData && !loading && attempts < 3) {
      const timer = setTimeout(() => {
        setActiveTab('yearly');
        setTimeout(() => {
          setActiveTab('monthly');
          setAttempts(prev => prev + 1);
        }, 100);
      }, 500 * attempts); // Increasing delay for each attempt

      return () => clearTimeout(timer);
    }
  }, [monthlyData, yearlyData, loading, attempts]);

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

  if (loading) return <div style={{ padding: '1rem', backgroundColor: '#17254A' }}>Loading...</div>;
  if (error) return <div style={{ padding: '1rem', backgroundColor: '#17254A' }}>Error: {error}</div>;
  if (!monthlyData || !yearlyData) return null;

  const currentData = activeTab === 'monthly' ? monthlyData : yearlyData;

  return (
    <div id="leaderboard-container" style={{ 
      backgroundColor: '#17254A',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 'min-content',
      maxHeight: 'fit-content'
    }}>
      <div className="tab-container" style={{ margin: 0 }}>
        <div className={`tab ${activeTab === 'monthly' ? 'active' : ''}`}
             onClick={() => setActiveTab('monthly')}>
          Monthly Challenge
        </div>
        <div className={`tab ${activeTab === 'yearly' ? 'active' : ''}`}
             onClick={() => setActiveTab('yearly')}>
          Yearly Rankings
        </div>
      </div>

      {activeTab === 'monthly' && monthlyData.gameInfo && (
        <>
          <div className="game-header">
            <img src={`https://retroachievements.org${monthlyData.gameInfo.ImageIcon}`} 
                 alt={monthlyData.gameInfo.Title}
                 onError={(e) => {
                   e.currentTarget.src = 'https://retroachievements.org/Images/017657.png';
                 }} />
            <h2 className="game-title">{monthlyData.gameInfo.Title}</h2>
          </div>

          <div className="challenge-list">
            &gt; This challenge runs from January 1st, 2025 to January 31st, 2025.<br />
            &gt; Hardcore mode must be enabled<br />
            &gt; All achievements are eligible<br />
            &gt; Progress tracked via retroachievements<br />
            &gt; No hacks/save states/cheats allowed<br />
            &gt; Any discrepancies, ties, or edge case situations will be judged case by case and settled upon in the multiplayer game of each combatant's choosing.
          </div>
        </>
      )}

      <div style={{ padding: '8px 16px' }}>
        {currentData.leaderboard.map((entry, index) => (
          <div key={entry.username} className="leaderboard-entry">
            <div className={`rank ${
              index === 0 ? 'medal-gold' : 
              index === 1 ? 'medal-silver' : 
              index === 2 ? 'medal-bronze' : ''
            }`}>
              #{index + 1}
            </div>
            <img src={entry.profileImage}
                 alt={entry.username}
                 className="profile-image"
                 onError={(e) => {
                   e.currentTarget.src = 'https://retroachievements.org/UserPic/_user.png';
                 }} />
            <div className="flex-grow">
              <a href={entry.profileUrl} 
                 target="_blank"
                 rel="noopener noreferrer"
                 className="username">
                {entry.username}
              </a>
              <div className="flex flex-col gap-0.5">
                {activeTab === 'monthly' ? (
                  <>
                    <div>{entry.completedAchievements}/{entry.totalAchievements}</div>
                    <div>{entry.completionPercentage}%</div>
                  </>
                ) : (
                  <div>{entry.points} points</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ 
        fontSize: '0.875rem',
        color: '#8892b0',
        textAlign: 'center',
        padding: '1rem',
        borderTop: '1px solid #2a3a6a',
        marginTop: '0.5rem'
      }}>
        Last updated: {new Date(currentData.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
};

export default Leaderboard;
