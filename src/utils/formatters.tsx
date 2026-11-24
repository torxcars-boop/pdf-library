import {
  Atom,
  BookOpen,
  BookOpenCheck,
  Code2,
  Feather,
  GraduationCap,
  HeartPulse,
  Landmark,
  Sparkles,
  Users,
} from 'lucide-react';
import React from 'react';

export function formatBytesAr(bytes: number): string {
  if (!bytes || bytes <= 0) return '1.2 MB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function formatDateAr(dateStr: string | null | undefined): string {
  if (!dateStr) return 'حديثاً';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return 'حديثاً';
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function formatNumberAr(num: number): string {
  return new Intl.NumberFormat('en-US').format(num || 0);
}

export function getCategoryIcon(iconName: string, className = 'w-6 h-6'): React.ReactNode {
  switch (iconName) {
    case 'BookOpenCheck':
      return <BookOpenCheck className={className} />;
    case 'GraduationCap':
      return <GraduationCap className={className} />;
    case 'Atom':
      return <Atom className={className} />;
    case 'HeartPulse':
      return <HeartPulse className={className} />;
    case 'Code2':
      return <Code2 className={className} />;
    case 'Feather':
      return <Feather className={className} />;
    case 'Landmark':
      return <Landmark className={className} />;
    case 'Users':
      return <Users className={className} />;
    case 'Sparkles':
      return <Sparkles className={className} />;
    default:
      return <BookOpen className={className} />;
  }
}
