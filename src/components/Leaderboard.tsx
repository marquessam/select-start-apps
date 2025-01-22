import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface LeaderboardEntry {
  username: string;
  profileImage: string;
  profileUrl: string;
  completedAchievements: number;
  totalAchievements: number;
  completionPercentage: number;
  hasBeatenGame: boolean;
}

interface GameInfo {
  Title: string;
  ImageIcon: string;
}

interface LeaderboardData {
  gameInfo: GameInfo;
  leaderboard: LeaderboardEntry[];
  additionalParticipants: string[];
  lastUpdated: string;
}

const Leaderboard = () => {
  const [monthlyData, setMonthlyData] = useState<LeaderboardData | null>(null);
  const [yearlyData, setYearlyData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getCurrentMonthInfo = () => {
    const now = new Date();
    const monthName = now.toLocaleString('default', { month: 'long' });
    const year = now.getFullYear();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    nextMonth.setDate(nextMonth.getDate() - 1);
    
    return {
      monthName,
      year,
      startDate: `${monthName} 1st, ${year}`,
      endDate: `${monthName} ${nextMonth.getDate()}${getDaySuffix(nextMonth.getDate())}, ${year}`
    };
  };

  const getDaySuffix = (day: number): string => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [monthlyResponse, yearlyResponse] = await Promise.all([
        fetch('/api/monthly-leaderboard'),
        fetch('/api/yearly-leaderboard')
      ]);

      if (!monthlyResponse.ok || !yearlyResponse.ok) {
        throw new Error('Failed to fetch leaderboard data');
      }

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

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'text-yellow-300'; // Gold
    if (rank === 2) return 'text-gray-400';   // Silver
    if (rank === 3) return 'text-yellow-600'; // Bronze
    return 'text-white';
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-8 bg-[#17254A] rounded-lg">
        <div className="text-center text-white">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto p-8 bg-[#17254A] rounded-lg">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!monthlyData) return null;

  const { monthName, startDate, endDate } = getCurrentMonthInfo();

  return (
    <div className="w-full max-w-4xl mx-auto bg-[#17254A] text-white">
      {/* Header */}
      <div className="p-8">
        <h1 className="text-4xl font-bold text-center mb-8">{monthName} Leaderboards</h1>
      </div>

      {/* Game Info */}
      <div className="text-center mb-8">
        <a 
          href={`https://retroachievements.org/game/319`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block"
        >
          <img 
            src={`https://retroachievements.org${monthlyData.gameInfo.ImageIcon}`}
            alt={monthlyData.gameInfo.Title}
            className="w-24 h-24 mx-auto mb-4"
            onError={(e) => {
              e.currentTarget.src = 'https://retroachievements.org/Images/017657.png';
            }}
          />
          <h2 className="text-2xl font-bold">{monthlyData.gameInfo.Title}</h2>
        </a>
      </div>

      {/* Challenge Info */}
      <div className="bg-[#1b2d5c] p-6 mx-4 rounded-lg mb-8 text-sm">
        This challenge runs from {startDate} to {endDate} as part of the gaming community
        Select Start. All players must have hardcore mode turned on for RetroAchievements. Any
        discrepancies, ties, or edge case situations will be judged case by case and settled upon in the
        multiplayer game of each combatant's choosing.
      </div>

      {/* Leaderboard */}
      <div className="px-4 space-y-2">
        {monthlyData.leaderboard.map((user, index) => (
          <div 
            key={user.username}
            className="flex items-center gap-4 bg-[#1b2d5c] p-4 rounded-lg"
          >
            <div className="flex items-center gap-2 w-20">
              <span className={`text-lg font-bold ${getRankStyle(index + 1)}`}>
                #{index + 1}
              </span>
              <span className="text-2xl">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''}
              </span>
            </div>
            
            <img 
              src={user.profileImage}
              alt={user.username}
              className="w-12 h-12 rounded-full border-2 border-purple-500"
              onError={(e) => {
                e.currentTarget.src = 'https://retroachievements.org/UserPic/_user.png';
              }}
            />
            
            <div className="flex-grow min-w-[200px]">
              <a 
                href={user.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-purple-400 font-bold"
              >
                {user.username}
              </a>
              <div className="mt-2 bg-[#17254A] rounded-full h-2">
                <div 
                  className="bg-purple-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${user.completionPercentage}%` }}
                />
              </div>
            </div>
            
            <div className="text-right whitespace-nowrap">
              {user.completedAchievements}/{user.totalAchievements}
              <br />
              <span className="text-purple-400">{user.completionPercentage}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Last Updated */}
      <div className="mt-6 p-4 text-center text-gray-400 text-sm">
        Last updated: {new Date(monthlyData.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
};

export default Leaderboard;
