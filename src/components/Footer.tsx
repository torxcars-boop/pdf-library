import React from 'react';
import { BookOpen, Mail, MessageCircle, Phone, Send } from 'lucide-react';
import { SiteSettingsDTO } from '../types/library';

interface FooterProps {
  settings: SiteSettingsDTO;
  onNavigate: (path: string, sectionId?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ settings, onNavigate }) => {
  const email = settings.contactEmail || 'torxcars@gmail.com';
  const phone = settings.contactPhone || '+201115491611';
  const whatsappDigits = phone.replace(/[^\d]/g, '') || '201115491611';
  const telegramUrl = settings.socialTelegram || 'https://t.me/PDF_Library0';

  return (
    <footer className="border-t border-[#E8B94F]/25 bg-[#040E21] text-slate-300">
      {/* About & Contact Sections */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* About Us */}
          <div id="about-us" className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-[#E8B94F]/60">
                <img
                  src={settings.logoUrl || '/assets/aistudio/photo_6012469020994506717_c_09eff44c.jpg'}
                  alt={settings.siteNameAr}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-white">
                  {settings.siteNameAr}
                </h2>
                <p className="text-xs text-[#FFD778]">{settings.footerTaglineAr}</p>
              </div>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-slate-300">
              {settings.aboutTextAr}
            </p>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-base font-bold text-[#FFD778]">روابط سريعة</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/', 'hero')}
                  className="hover:text-[#FFD778] transition-colors"
                >
                  الرئيسية
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/', 'categories')}
                  className="hover:text-[#FFD778] transition-colors"
                >
                  أقسام المكتبة
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/', 'latest-books')}
                  className="hover:text-[#FFD778] transition-colors"
                >
                  أحدث الكتب المضافة
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/', 'popular-books')}
                  className="hover:text-[#FFD778] transition-colors"
                >
                  الأكثر تحميلاً
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Us */}
          <div id="contact-us" className="lg:col-span-4 space-y-4">
            <h3 className="text-base font-bold text-[#FFD778]">اتصل بنا</h3>
            <div className="space-y-3 text-sm">
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-2.5 text-slate-200 hover:text-[#FFD778] transition-colors"
              >
                <Mail className="h-4 w-4 text-[#E8B94F] shrink-0" />
                <span className="font-mono-num" dir="ltr">
                  {email}
                </span>
              </a>

              <a
                href={`tel:${phone}`}
                className="flex items-center gap-2.5 text-slate-200 hover:text-[#FFD778] transition-colors"
              >
                <Phone className="h-4 w-4 text-[#E8B94F] shrink-0" />
                <span className="font-mono-num" dir="ltr">
                  {phone}
                </span>
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href={`https://wa.me/${whatsappDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/35 bg-emerald-950/50 px-3.5 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-900/60 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                <span>تواصل عبر واتساب</span>
              </a>

              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-[#E8B94F]/40 bg-[#10274A] px-3.5 py-2 text-xs font-semibold text-[#FFD778] hover:bg-[#E8B94F] hover:text-[#06152F] transition-colors"
              >
                <Send className="h-4 w-4" />
                <span>قناة تيليجرام</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Copyright Bar */}
      <div className="border-t border-[#E8B94F]/15 bg-[#030A18] py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 text-xs text-slate-400 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#E8B94F]" />
            <span>
              © {new Date().getFullYear()} {settings.siteNameAr} — جميع الحقوق محفوظة
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="hover:text-[#FFD778]">
              خريطة الموقع (Sitemap)
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
