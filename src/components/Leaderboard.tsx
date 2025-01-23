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
    <div id="leaderboard-content" className="bg-[#17254A]" style={{ minHeight: 'min-content' }}>
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

      <div style={{ padding: '0 12px' }}>
        {currentData.leaderboard.map((entry, index) => (
          <div key={entry.username} className="leaderboard-entry" style={{ marginBottom: index === currentData.leaderboard.length - 1 ? 0 : '8px' }}>
            <div className={`rank ${
              index === 0 ? 'medal-gold' : 
              index === 1 ? 'medal-silver' : 
              index === 2 ? 'medal-bronze' : ''
            }`}>
              #{index + 1}
            </div>
            {index < 3 && <div>{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</div>}
            <img src={entry.profileImage}
                 alt={entry.username}
                 className="profile-image"
                 onError={(e) => {
                   e.currentTarget.src = 'https://retroachievements.org/UserPic/_user.png';
                 }} />
            <div>
              <a href={entry.profileUrl} 
                 target="_blank"
                 rel="noopener noreferrer"
                 className="username">
                {entry.username}
              </a>
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
        ))}
      </div>

      <div style={{ 
        fontSize: '0.875rem',
        color: '#8892b0',
        textAlign: 'center',
        padding: '12px 0',
        borderTop: '1px solid #2a3a6a',
        marginTop: '12px'
      }}>
        Last updated: {new Date(currentData.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
};

export default Leaderboard;
