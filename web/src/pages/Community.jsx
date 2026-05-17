import React from 'react';
import Sidebar from '../components/Community/Sidebar';
import ActivityFeed from '../components/Community/ActivityFeed';
import RightPanel from '../components/Community/RightPanel';


export default function Community() {
  return (
    <main className="flex-grow pt-32 pb-24 px-margin-mobile md:px-margin-desktop w-full max-w-container-max mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        <Sidebar />
        <ActivityFeed />
        <RightPanel />
      </div>
    </main>
  );
}
