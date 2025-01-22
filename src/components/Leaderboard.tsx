import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Trophy } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface LeaderboardEntry {
  username: string;
  profileImage: string;
  profileUrl: string;
  completedAchievements: number;
  totalAchievements: number;
  completionPercentage: number;
  points?: number;
}

interface GameInfo {
  Title: string;
  ImageIcon: string;
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  gameInfo: GameInfo;
  lastUpdated: string;
  additionalParticipants?: string[];
}

const Leaderboard = () => {
  const [activeTab, setActiveTab] = useState('monthly');
  const [monthlyData, setMonthlyData] = useState<LeaderboardData | null>(null);
  const [yearlyData, setYearlyData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300000); // Refresh every 5 minutes
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

  const getMedal = (position: number) => {
    switch(position) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-8 bg-ra-blue rounded-lg shadow-xl">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-ra-purple border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-300">Loading leaderboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load leaderboard: {error}
            <button 
              onClick={fetchData}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-ra-purple hover:bg-opacity-90 rounded-md"
            >
              Retry
            </button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8 bg-ra-blue rounded-lg shadow-xl text-gray-100">
      <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
        <img 
          src="https://i.ibb.co/TgK5Hx9/select-start-logo-4.png" 
          alt="Select Start" 
          className="w-20 h-20 object-contain"
        />
        <div className="text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-bold">Select Start Leaderboards</h1>
        </div>
      </div>

      <Tabs defaultValue="monthly" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="monthly">Monthly Challenge</TabsTrigger>
          <TabsTrigger value="yearly">Yearly Rankings</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly">
          {monthlyData && (
            <>
              {/* Game Info */}
              <div className="text-center border-y border-ra-dark py-6 mb-8">
                <a 
                  href={`https://retroachievements.org/game/319`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block hover:opacity-90 transition-opacity"
                >
                  <img 
                    src={`https://retroachievements.org${monthlyData.gameInfo.ImageIcon}`}
                    alt={monthlyData.gameInfo.Title}
                    className="w-24 h-24 rounded-lg mx-auto mb-4 object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'https://retroachievements.org/Images/017657.png';
                    }}
                  />
                  <h2 className="text-xl font-semibold">{monthlyData.gameInfo.Title}</h2>
                </a>
              </div>

              {/* Monthly Leaderboard */}
              <div className="space-y-4">
                {monthlyData.leaderboard.map((user, index) => (
                  <div 
                    key={user.username}
                    className="flex flex-wrap md:flex-nowrap items-center gap-4 bg-ra-dark p-4 rounded-lg hover:translate-x-2 transition-transform"
                  >
                    <div className="flex items-center gap-4 min-w-[120px]">
                      <span className="text-lg font-bold min-w-[30px]">#{index + 1}</span>
                      <span className="text-2xl">{getMedal(index)}</span>
                    </div>
                    
                    <img 
                      src={user.profileImage}
                      alt={user.username}
                      className="w-12 h-12 rounded-full border-2 border-ra-purple"
                      onError={(e) => {
                        e.currentTarget.src = 'https://retroachievements.org/UserPic/_user.png';
                      }}
                    />
                    
                    <div className="flex-grow min-w-[200px]">
                      <a 
                        href={user.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold hover:text-ra-purple transition-colors"
                      >
                        {user.username}
                      </a>
                      <div className="mt-2 bg-ra-blue rounded-full h-2.5">
                        <div 
                          className="bg-ra-purple h-full rounded-full transition-all duration-500"
                          style={{ width: `${user.completionPercentage}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="text-right min-w-[100px]">
                      <div>{user.completedAchievements}/{user.totalAchievements}</div>
                      <div className="text-ra-purple">{user.completionPercentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="yearly">
          {yearlyData && (
            <div className="space-y-4">
              {yearlyData.leaderboard.map((user, index) => (
                <div 
                  key={user.username}
                  className="flex flex-wrap md:flex-nowrap items-center gap-4 bg-ra-dark p-4 rounded-lg hover:translate-x-2 transition-transform"
                >
                  <div className="flex items-center gap-4 min-w-[120px]">
                    <span className="text-lg font-bold min-w-[30px]">#{index + 1}</span>
                    <span className="text-2xl">{getMedal(index)}</span>
                  </div>
                  
                  <img 
                    src={user.profileImage}
                    alt={user.username}
                    className="w-12 h-12 rounded-full border-2 border-ra-purple"
                    onError={(e) => {
                      e.currentTarget.src = 'https://retroachievements.org/UserPic/_user.png';
                    }}
                  />
                  
                  <div className="flex-grow min-w-[200px]">
                    <a 
                      href={user.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold hover:text-ra-purple transition-colors"
                    >
                      {user.username}
                    </a>
                    <div className="text-gray-300 mt-1">
                      {user.points} points
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Last Updated */}
      <div className="mt-6 text-center text-gray-400 text-sm">
        Last updated: {new Date(monthlyData?.lastUpdated || '').toLocaleString()}
      </div>
    </div>
  );
};

export default Leaderboard;
