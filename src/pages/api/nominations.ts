import type { NextApiRequest, NextApiResponse } from 'next';
import { getMongoDb } from '@/utils/mongodb';
import { WithId, Document } from 'mongodb';

interface NominationDoc extends Document {
  _id: string;
  nominations?: {
    [key: string]: Array<{
      game: string;
      platform: string;
      discordUsername: string;
      discordId: string;
    }>;
  };
}

interface StatusDoc extends Document {
  _id: string;
  isOpen: boolean;
}

// For the original web app format
interface RawNomination {
  game: string;
  platform: string;
  discordUsername: string;
  discordId: string;
}

// For the Carrd site format
interface CarrdNomination {
  title: string;
  gameId?: string;
  achievementCount: number;
  imageUrl: string;
  nominationCount: number;
  nominatedBy: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const db = await getMongoDb();
    
    // Fetch nominations document
    const nominationsDoc = await db
      .collection<NominationDoc>('nominations')
      .findOne({ _id: 'nominations' });
    
    // Get nomination status
    const statusDoc = await db
      .collection<StatusDoc>('nominations')
      .findOne({ _id: 'status' });
    
    // Combine all nominations from all periods into a single array
    const allNominations = nominationsDoc?.nominations
      ? Object.values(nominationsDoc.nominations).flat()
      : [];

    // Determine if we should format for the Carrd site or the web app
    const formatForCarrd = req.query.format === 'carrd';

    if (formatForCarrd) {
      // Group nominations by game title to count them and collect nominators
      const gameGroups = allNominations.reduce((acc, nomination) => {
        const game = nomination.game;
        if (!acc[game]) {
          acc[game] = {
            title: game,
            platform: nomination.platform,
            nominatedBy: [nomination.discordUsername],
            count: 1
          };
        } else {
          if (!acc[game].nominatedBy.includes(nomination.discordUsername)) {
            acc[game].nominatedBy.push(nomination.discordUsername);
            acc[game].count++;
          }
        }
        return acc;
      }, {} as Record<string, { title: string, platform: string, nominatedBy: string[], count: number }>);
      
      // Transform to Carrd format
      const formattedNominations: CarrdNomination[] = Object.values(gameGroups).map(group => ({
        title: group.title,
        // You can add gameId here if you have a mapping
        achievementCount: 0, // This would need to be fetched from RA API
        imageUrl: `/api/placeholder/250/140`, // Placeholder images for now
        nominationCount: group.count,
        nominatedBy: group.nominatedBy
      }));
      
      return res.status(200).json({
        totalNominations: allNominations.length,
        uniqueGames: formattedNominations.length,
        nominations: formattedNominations,
        isOpen: statusDoc?.isOpen || false,
        lastUpdated: new Date().toISOString()
      });
    } else {
      // Original web app format
      // Remove any duplicate nominations (same game)
      const uniqueNominations = allNominations.reduce((acc, current) => {
        const exists = acc.find(nom => nom.game === current.game);
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, [] as RawNomination[]);
      
      return res.status(200).json({
        nominations: uniqueNominations,
        isOpen: statusDoc?.isOpen || false,
        lastUpdated: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Nominations API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
