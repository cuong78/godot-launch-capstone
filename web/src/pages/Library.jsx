import React from 'react';
import Sidebar from '../components/Library/Sidebar';
import MainContent from '../components/Library/MainContent';

export default function Library() {
  return (
    <div className="pt-24 h-screen flex pb-8 w-full">
      <Sidebar />
      <MainContent />
    </div>
  );
}
