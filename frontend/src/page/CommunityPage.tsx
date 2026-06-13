import React from 'react';
import { CommunityHub } from '../components/CommunityHub';

interface CommunityPageProps {
  darkMode: boolean;
  setCurrentScreen: (screen: any) => void;
  onViewPostDetails: (post: any) => void;
  onViewAuthorProfile: (author: any) => void;
}

export const CommunityPage: React.FC<CommunityPageProps> = ({
  darkMode,
  setCurrentScreen,
  onViewPostDetails,
  onViewAuthorProfile
}) => {
  return (
    <CommunityHub 
      darkMode={darkMode}
      onNavigateToSeller={() => { setCurrentScreen('upload'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
      onNavigateToMarketplace={() => { setCurrentScreen('marketplace'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
      onViewPostDetails={onViewPostDetails}
      onViewAuthorProfile={onViewAuthorProfile}
    />
  );
};
