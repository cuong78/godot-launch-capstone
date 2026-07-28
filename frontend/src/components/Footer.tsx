import React from "react";
import { useTranslation } from "react-i18next";
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
  labelKey: string;
  screen?: ScreenType;
  href?: string;
}

interface FooterSection {
  titleKey: string;
  links: FooterLink[];
}

const FOOTER_SECTIONS: FooterSection[] = [
  {
    titleKey: "footer.sections.platform",
    links: [
      { labelKey: "footer.links.about", screen: "explore" },
      { labelKey: "footer.links.support", screen: "explore" },
      { labelKey: "footer.links.publish", screen: "upload" },
      { labelKey: "footer.links.refunds", screen: "wallet" },
      { labelKey: "footer.links.legal", screen: "explore" },
    ],
  },
  {
    titleKey: "footer.sections.marketplace",
    links: [
      { labelKey: "footer.links.browseGames", screen: "marketplace" },
      { labelKey: "footer.links.sourceCode", screen: "marketplace" },
      { labelKey: "footer.links.assetPacks", screen: "marketplace" },
      { labelKey: "footer.links.freeResources", screen: "marketplace" },
    ],
  },
  {
    titleKey: "footer.sections.tools",
    links: [
      { labelKey: "footer.links.godotEngine", href: "https://godotengine.org" },
      { labelKey: "footer.links.githubIntegration", href: "https://github.com" },
      { labelKey: "footer.links.aiReview", screen: "dashboard" },
      { labelKey: "footer.links.faceVerification", screen: "developer-onboarding" },
      { labelKey: "footer.links.publishingWizard", screen: "path" },
    ],
  },
  {
    titleKey: "footer.sections.services",
    links: [
      { labelKey: "footer.links.developerDashboard", screen: "dashboard" },
      { labelKey: "footer.links.walletPayments", screen: "wallet" },
      { labelKey: "footer.links.publishingAgreements", screen: "path" },
    ],
  },
  {
    titleKey: "footer.sections.resources",
    links: [
      { labelKey: "footer.links.documentation", href: "https://docs.godotengine.org" },
      { labelKey: "footer.links.developerGuide", screen: "developer-onboarding" },
      { labelKey: "footer.links.security", screen: "explore" },
    ],
  },
  {
    titleKey: "footer.sections.company",
    links: [
      { labelKey: "footer.links.aboutUs", screen: "explore" },
      { labelKey: "footer.links.newsroom", screen: "explore" },
      { labelKey: "footer.links.careers", screen: "explore" },
      { labelKey: "footer.links.contact", screen: "explore" },
    ],
  },
];

const SOCIAL_LINKS = [
  { labelKey: "footer.social.x", icon: <span className="text-xl leading-none">𝕏</span> },
  { labelKey: "footer.social.facebook", icon: <Facebook size={20} /> },
  { labelKey: "footer.social.instagram", icon: <Instagram size={20} /> },
  { labelKey: "footer.social.youtube", icon: <Youtube size={21} /> },
  { labelKey: "footer.social.linkedin", icon: <Linkedin size={20} /> },
];

export function Footer({ setCurrentScreen, noTopMargin = false }: FooterProps) {
  const { t } = useTranslation(["shared"]);

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
                key={social.labelKey}
                type="button"
                aria-label={t(social.labelKey)}
                title={t(social.labelKey)}
                className="transition-colors hover:text-white"
              >
                {social.icon}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 text-sm font-semibold">
            <span>{t("footer.news")}</span>
            <button
              type="button"
              onClick={() => navigate("signup")}
              className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2 text-[#e1e2e6] transition-colors hover:bg-white/25 hover:text-white"
            >
              <Mail size={16} />
              {t("footer.signUp")}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-9 py-8 sm:grid-cols-3 lg:grid-cols-6 lg:gap-x-12">
          {FOOTER_SECTIONS.map((section) => (
            <section key={section.titleKey}>
              <h2 className="mb-3 text-base font-bold text-white">
                {t(section.titleKey)}
              </h2>
              <ul className="space-y-2 text-sm text-[#c0c2ca]">
                {section.links.map((link) => (
                  <li key={link.labelKey}>
                    {link.href ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="transition-colors hover:text-white hover:underline"
                      >
                        {t(link.labelKey)}
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => link.screen && navigate(link.screen)}
                        className="text-left transition-colors hover:text-white hover:underline"
                      >
                        {t(link.labelKey)}
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
            {t("footer.copyright")}
          </p>

          <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-wrap gap-x-7 gap-y-2 text-sm font-medium text-white">
              <a href="#terms" className="hover:underline">{t("footer.terms")}</a>
              <a href="#privacy" className="hover:underline">{t("footer.privacy")}</a>
              <a href="#cookies" className="hover:underline">{t("footer.cookies")}</a>
            </div>

            <button
              type="button"
              onClick={() => navigate("explore")}
              className="flex items-center gap-2.5 self-end"
              aria-label={t("footer.backHome")}
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
