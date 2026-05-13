import React from 'react';
import SideNavBar from '../components/DevPortal/SideNavBar';
import { Outlet } from 'react-router-dom';

export default function DevPortal() {
  return (
    <div className="flex flex-1 w-full max-w-container-max mx-auto overflow-hidden relative">
      <SideNavBar />
      <Outlet />
    </div>
  );
}
