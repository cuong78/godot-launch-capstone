import React from 'react';
import Hero from '../components/Hero';
import Discover from '../components/Discover';

export default function Home() {
  return (
    <main className="pt-32 pb-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto space-y-16">
      <Hero />
      <Discover />
    </main>
  );
}
