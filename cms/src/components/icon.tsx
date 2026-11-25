import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowSquareOutIcon,
  ArticleIcon,
  ChartBarIcon,
  ChatCircleTextIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockCounterClockwiseIcon,
  ConfettiIcon,
  DownloadSimpleIcon,
  EnvelopeSimpleIcon,
  FilesIcon,
  GoogleLogoIcon,
  ImagesIcon,
  LockSimpleIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PathIcon,
  PencilSimpleIcon,
  PlusIcon,
  SignOutIcon,
  SquaresFourIcon,
  StorefrontIcon,
  TrashIcon,
  UploadSimpleIcon,
  UserPlusIcon,
  UsersThreeIcon,
  XIcon,
} from "@phosphor-icons/react/ssr";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";

const ICONS = {
  "arrow-left": ArrowLeftIcon,
  "arrow-right": ArrowRightIcon,
  "arrow-square-out": ArrowSquareOutIcon,
  article: ArticleIcon,
  "chart-bar": ChartBarIcon,
  "chat-circle-text": ChatCircleTextIcon,
  "check-circle": CheckCircleIcon,
  check: CheckIcon,
  "clock-counter-clockwise": ClockCounterClockwiseIcon,
  confetti: ConfettiIcon,
  "download-simple": DownloadSimpleIcon,
  "envelope-simple": EnvelopeSimpleIcon,
  files: FilesIcon,
  "google-logo": GoogleLogoIcon,
  images: ImagesIcon,
  "lock-simple": LockSimpleIcon,
  "magnifying-glass": MagnifyingGlassIcon,
  "map-pin": MapPinIcon,
  path: PathIcon,
  "pencil-simple": PencilSimpleIcon,
  plus: PlusIcon,
  "sign-out": SignOutIcon,
  "squares-four": SquaresFourIcon,
  storefront: StorefrontIcon,
  trash: TrashIcon,
  "upload-simple": UploadSimpleIcon,
  "user-plus": UserPlusIcon,
  "users-three": UsersThreeIcon,
  x: XIcon,
} satisfies Record<string, PhosphorIcon>;

export type IconName = keyof typeof ICONS;

/** Phosphor duotone icon by name (collection icons are stored by name in the database). */
export function Icon({ name, size = 18, className, color }: { name: string; size?: number; className?: string; color?: string }) {
  const C = ICONS[name as IconName] ?? FilesIcon;
  return <C weight="duotone" size={size} className={className} color={color} aria-hidden />;
}
