import React from "react";
import {
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  Youtube,
} from "lucide-react";
import logoImage from "../../assets/logo.png";
import { ScreenType } from "../types";

interface FooterProps {
  setCurrentScreen: (screen: ScreenType) => void;
  noTopMargin?: boolean;
}

interface FooterLink {
  label: string;
  screen?: ScreenType;
  href?: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

const FOOTER_SECTIONS: FooterSection[] = [
  {
    title: "GodotLaunch",
    links: [
      { label: "About", screen: "explore" },
      { label: "Support", screen: "explore" },
      { label: "Publish on GodotLaunch", screen: "upload" },
      { label: "Refunds", screen: "wallet" },
      { label: "Legal", screen: "explore" },
    ],
  },
  {
    title: "Marketplace",
    links: [
      { label: "Browse Games", screen: "marketplace" },
      { label: "Source Code", screen: "marketplace" },
      { label: "Asset Packs", screen: "marketplace" },
      { label: "Free Resources", screen: "marketplace" },
    ],
  },
  {
    title: "Tools",
    links: [
      { label: "Godot Engine", href: "https://godotengine.org" },
      { label: "GitHub Integration", href: "https://github.com" },
      { label: "AI Review", screen: "dashboard" },
      { label: "Face Verification", screen: "developer-onboarding" },
      { label: "Publishing Wizard", screen: "path" },
    ],
  },
  {
    title: "Online Services",
    links: [
      { label: "Developer Dashboard", screen: "dashboard" },
      { label: "Wallet & Payments", screen: "wallet" },
      { label: "Publishing Agreements", screen: "path" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "https://docs.godotengine.org" },
      { label: "Developer Guide", screen: "developer-onboarding" },
      { label: "Security", screen: "explore" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", screen: "explore" },
      { label: "Newsroom", screen: "explore" },
      { label: "Careers", screen: "explore" },
      { label: "Contact", screen: "explore" },
    ],
  },
];

const SOCIAL_LINKS = [
  { label: "X", icon: <span className="text-xl leading-none">𝕏</span> },
  { label: "Facebook", icon: <Facebook size={20} /> },
  { label: "Instagram", icon: <Instagram size={20} /> },
  { label: "YouTube", icon: <Youtube size={21} /> },
  { label: "LinkedIn", icon: <Linkedin size={20} /> },
];

export function Footer({ setCurrentScreen, noTopMargin = false }: FooterProps) {
  const navigate = (screen: ScreenType) => {
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer
      id="godotlaunch-footer"
      className={`relative z-10 border-t border-white/10 bg-[#17181d] text-white ${noTopMargin ? "" : "mt-16"}`}
    >
      <div className="mx-auto w-full max-w-[1440px] px-5 py-5 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-5 border-b border-transparent pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-6 text-[#b9bbc4]">
            {SOCIAL_LINKS.map((social) => (
              <button
                key={social.label}
                type="button"
                aria-label={social.label}
                title={social.label}
                className="transition-colors hover:text-white"
              >
                {social.icon}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 text-sm font-semibold">
            <span>Get the latest GodotLaunch news.</span>
            <button
              type="button"
              onClick={() => navigate("signup")}
              className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2 text-[#e1e2e6] transition-colors hover:bg-white/25 hover:text-white"
            >
              <Mail size={16} />
              Sign up
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-9 py-8 sm:grid-cols-3 lg:grid-cols-6 lg:gap-x-12">
          {FOOTER_SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="mb-3 text-base font-bold text-white">
                {section.title}
              </h2>
              <ul className="space-y-2 text-sm text-[#c0c2ca]">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {link.href ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="transition-colors hover:text-white hover:underline"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => link.screen && navigate(link.screen)}
                        className="text-left transition-colors hover:text-white hover:underline"
                      >
                        {link.label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="border-t border-white/15 pt-8">
          <p className="max-w-5xl text-xs leading-relaxed text-[#b5b7c0]">
            © 2026 GodotLaunch. All rights reserved. Godot and the Godot logo are
            trademarks of the Godot Foundation. All other trademarks and
            registered trademarks are the property of their respective owners.
          </p>

          <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-wrap gap-x-7 gap-y-2 text-sm font-medium text-white">
              <a href="#terms" className="hover:underline">Terms of Service</a>
              <a href="#privacy" className="hover:underline">Privacy Policy</a>
              <a href="#cookies" className="hover:underline">Cookie Settings</a>
            </div>

            <button
              type="button"
              onClick={() => navigate("explore")}
              className="flex items-center gap-2.5 self-end"
              aria-label="Back to GodotLaunch home"
            >
              <span className="relative h-10 w-10 overflow-hidden">
                <img
                  src={logoImage}
                  alt=""
                  className="pointer-events-none absolute -left-[55px] -top-[10px] h-[82px] w-auto max-w-none select-none"
                />
              </span>
              <span className="font-display text-lg font-bold">godotlaunch</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
