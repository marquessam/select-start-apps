import type { NextPage } from 'next';
import Nominations from '@/components/Nominations';

const NominationsPage: NextPage = () => {
  return (
    <div className="min-h-screen bg-gray-900 p-4 flex justify-center items-start">
      <Nominations />
    </div>
  );
};

export default NominationsPage;
