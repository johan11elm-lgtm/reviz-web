// -------------------------------------------------------
// Réviz — Icônes vectorielles partagées (trait 1.8, 24×24, currentColor).
// Remplacent les emojis d'interface : une icône fait 1em (classe .rv-ico,
// icons.css) et hérite donc de la taille du texte ou du conteneur. Dans un
// .rv-icon-square, la taille est fixée par le carré.
// Les illustrations (badges, matières, états vides) restent des mascottes.
// -------------------------------------------------------

const Icon = ({ children, className = '', ...rest }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={['rv-ico', className].filter(Boolean).join(' ')}
    aria-hidden="true"
    focusable="false"
    {...rest}
  >
    {children}
  </svg>
);

// ── Progression / gamification ──
export const FlameIcon = (p) => (
  <Icon {...p}>
    <path d="M12 22c4.4 0 7-2.9 7-7 0-3.1-1.7-5.3-3.5-7.2-.4 1.5-1.2 2.5-2.3 3C13.5 8.4 12.9 5.7 10.5 3 9.9 6.1 8 8.1 6.6 9.8 5.6 11 5 12.7 5 15c0 4.1 2.6 7 7 7Z" />
    <path d="M12 22c-1.8 0-3-1.4-3-3.1 0-1.6 1.2-2.5 1.8-3.9.8 1 1.5 1.6 2.3 2.4.6.6 1 1.2 1 1.9 0 1.5-1 2.7-2.1 2.7Z" />
  </Icon>
);
export const TargetIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" />
  </Icon>
);
export const BoltIcon = (p) => (
  <Icon {...p}><path d="M13 2 4.5 14H11l-1 8 8.5-12H12l1-8Z" /></Icon>
);
export const StarIcon = (p) => (
  <Icon {...p}><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3Z" /></Icon>
);
export const TrophyIcon = (p) => (
  <Icon {...p}>
    <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
    <path d="M8 6H5a2 2 0 0 0 0 4h3" />
    <path d="M16 6h3a2 2 0 0 1 0 4h-3" />
    <path d="M12 13v4" />
    <path d="M8 21h8" />
    <path d="M10 17h4v4" />
  </Icon>
);
export const RocketIcon = (p) => (
  <Icon {...p}>
    <path d="M12 2c3 3 4 7 3 11l-3 3-3-3C8 9 9 5 12 2Z" />
    <path d="M9 13l-4 2 2-5" />
    <path d="M15 13l4 2-2-5" />
    <circle cx="12" cy="8" r="1.4" />
    <path d="M10 19l2 3 2-3" />
  </Icon>
);
export const CalendarIcon = (p) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2.5" />
    <path d="M3 10h18" />
    <path d="M8 3v4" />
    <path d="M16 3v4" />
  </Icon>
);
export const ChartIcon = (p) => (
  <Icon {...p}>
    <path d="M5 20V10" />
    <path d="M12 20V4" />
    <path d="M19 20v-7" />
  </Icon>
);
export const TrendIcon = (p) => (
  <Icon {...p}>
    <path d="M3 17l6-6 4 4 8-8" />
    <path d="M14 7h7v7" />
  </Icon>
);
export const LayersIcon = (p) => (
  <Icon {...p}>
    <path d="M12 3 2 8l10 5 10-5-10-5Z" />
    <path d="M2 13l10 5 10-5" />
  </Icon>
);

// ── Contenus / formats ──
export const BookIcon = (p) => (
  <Icon {...p}>
    <path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5Z" />
    <path d="M4 19a2 2 0 0 0 2 2h12" />
    <path d="M8 7h7" />
    <path d="M8 11h5" />
  </Icon>
);
export const BookOpenIcon = (p) => (
  <Icon {...p}>
    <path d="M2 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2V5Z" />
    <path d="M22 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7V5Z" />
  </Icon>
);
export const FlashcardsIcon = (p) => (
  <Icon {...p}>
    <rect x="6" y="3" width="14" height="18" rx="2.5" transform="rotate(6 13 12)" />
    <rect x="4" y="5" width="14" height="18" rx="2.5" />
  </Icon>
);
export const QuizIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.2a2.5 2.5 0 0 1 4.9.5c0 1.7-2.4 1.8-2.4 3.3" />
    <circle cx="12" cy="16.5" r="0.6" fill="currentColor" />
  </Icon>
);
export const FileTextIcon = (p) => (
  <Icon {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6" />
    <path d="M9 17h6" />
  </Icon>
);
export const ResumeIcon = FileTextIcon;
export const MindmapIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="2.6" />
    <circle cx="5" cy="6" r="2" />
    <circle cx="19" cy="6" r="2" />
    <circle cx="5" cy="18" r="2" />
    <circle cx="19" cy="18" r="2" />
    <path d="M6.6 7.4 10 10.2" />
    <path d="M17.4 7.4 14 10.2" />
    <path d="M6.6 16.6 10 13.8" />
    <path d="M17.4 16.6 14 13.8" />
  </Icon>
);
export const ClipboardIcon = (p) => (
  <Icon {...p}>
    <rect x="5" y="4" width="14" height="17" rx="2.5" />
    <rect x="9" y="2" width="6" height="4" rx="1.2" />
    <path d="M9 11h6" />
    <path d="M9 15h6" />
  </Icon>
);

// ── Actions / états ──
export const CheckIcon = (p) => <Icon {...p}><path d="M5 12.5l4.5 4.5L19 7" /></Icon>;
export const XIcon = (p) => <Icon {...p}><path d="M6 6l12 12" /><path d="M18 6 6 18" /></Icon>;
export const CircleIcon = (p) => <Icon {...p}><circle cx="12" cy="12" r="8" /></Icon>;
export const SearchIcon = (p) => (
  <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Icon>
);
export const RefreshIcon = (p) => (
  <Icon {...p}><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 4v5h-5" /></Icon>
);
export const ChatIcon = (p) => (
  <Icon {...p}><path d="M21 12a8 8 0 0 1-11.7 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" /></Icon>
);
export const CameraIcon = (p) => (
  <Icon {...p}>
    <path d="M4 8h3l2-3h6l2 3h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" />
    <circle cx="12" cy="13.5" r="3.5" />
  </Icon>
);
export const PencilIcon = (p) => (
  <Icon {...p}><path d="M4 20l4.5-1L19 8.5a2.1 2.1 0 0 0-3-3L5.5 16 4 20Z" /><path d="M14.5 7l3 3" /></Icon>
);
export const BulbIcon = (p) => (
  <Icon {...p}>
    <path d="M9 18h6" />
    <path d="M10 21h4" />
    <path d="M12 3a6 6 0 0 0-4 10.5c.7.6 1 1.4 1 2.5h6c0-1.1.3-1.9 1-2.5A6 6 0 0 0 12 3Z" />
  </Icon>
);
export const SparkIcon = (p) => (
  <Icon {...p}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
    <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" />
  </Icon>
);
export const TrashIcon = (p) => (
  <Icon {...p}>
    <path d="M4 7h16" />
    <path d="M9 7V4h6v3" />
    <path d="M6 7l1 14h10l1-14" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </Icon>
);
export const FrameIcon = (p) => (
  <Icon {...p}>
    <path d="M3 8V5a2 2 0 0 1 2-2h3" />
    <path d="M16 3h3a2 2 0 0 1 2 2v3" />
    <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
    <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
  </Icon>
);
export const SunIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" /><path d="M12 20v2" /><path d="M2 12h2" /><path d="M20 12h2" />
    <path d="M4.9 4.9l1.4 1.4" /><path d="M17.7 17.7l1.4 1.4" />
    <path d="M4.9 19.1l1.4-1.4" /><path d="M17.7 6.3l1.4-1.4" />
  </Icon>
);
export const ThumbUpIcon = (p) => (
  <Icon {...p}>
    <path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3Z" />
    <path d="M7 11l4-8a2.5 2.5 0 0 1 2.5 2.5V9h5a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.3 20H7" />
  </Icon>
);
export const ThumbDownIcon = (p) => (
  <Icon {...p}>
    <path d="M7 13V4H4a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h3Z" />
    <path d="M7 13l4 8a2.5 2.5 0 0 0 2.5-2.5V15h5a2 2 0 0 0 2-2.3l-1.2-7A2 2 0 0 0 17.3 4H7" />
  </Icon>
);
export const MehIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 15h8" />
    <path d="M9 9.5h.01" /><path d="M15 9.5h.01" />
  </Icon>
);

// ── Compte / réglages ──
export const UserIcon = (p) => (
  <Icon {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Icon>
);
export const UsersIcon = (p) => (
  <Icon {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2 20a7 7 0 0 1 14 0" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M17 15a5 5 0 0 1 5 5" />
  </Icon>
);
export const MailIcon = (p) => (
  <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3 8l9 6 9-6" /></Icon>
);
export const KeyIcon = (p) => (
  <Icon {...p}>
    <circle cx="8" cy="15" r="4" />
    <path d="M11 12l9-9" />
    <path d="M17 6l2 2" />
    <path d="M14 9l2 2" />
  </Icon>
);
export const BellIcon = (p) => (
  <Icon {...p}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </Icon>
);
export const MoonIcon = (p) => (
  <Icon {...p}><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" /></Icon>
);
export const GemIcon = (p) => (
  <Icon {...p}>
    <path d="M6 3h12l4 6-10 12L2 9l4-6Z" />
    <path d="M2 9h20" />
    <path d="M12 21 8 9l2-6" />
    <path d="M12 21l4-12-2-6" />
  </Icon>
);
export const LockIcon = (p) => (
  <Icon {...p}><rect x="5" y="11" width="14" height="10" rx="2.5" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></Icon>
);
export const InfoIcon = (p) => (
  <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></Icon>
);
export const ScaleIcon = (p) => (
  <Icon {...p}>
    <path d="M12 3v18" />
    <path d="M6 21h12" />
    <path d="M4 7h16" />
    <path d="M6 7l-3 7a3 3 0 0 0 6 0L6 7Z" />
    <path d="M18 7l-3 7a3 3 0 0 0 6 0l-3-7Z" />
  </Icon>
);
export const LogOutIcon = (p) => (
  <Icon {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </Icon>
);
export const AlertIcon = (p) => (
  <Icon {...p}><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4" /><path d="M12 17h.01" /></Icon>
);
export const GraduationIcon = (p) => (
  <Icon {...p}>
    <path d="M2 9l10-5 10 5-10 5L2 9Z" />
    <path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5" />
    <path d="M22 9v6" />
  </Icon>
);
