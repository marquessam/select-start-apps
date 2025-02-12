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

    // Remove any duplicate nominations (same game)
    const uniqueNominations = allNominations.reduce((acc, current) => {
      const exists = acc.find(nom => nom.game === current.game);
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, [] as Array<{
      game: string;
      platform: string;
      discordUsername: string;
      discordId: string;
    }>);
    
    res.status(200).json({
      nominations: uniqueNominations,
      isOpen: statusDoc?.isOpen || false,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Nominations API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
