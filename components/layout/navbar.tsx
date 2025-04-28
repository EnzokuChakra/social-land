import { NotificationsDropdown } from '@/components/notifications/notifications-dropdown';

export function Navbar() {
  return (
    <nav className="...">
      <div className="flex items-center gap-4">
        <NotificationsDropdown />
      </div>
    </nav>
  );
} 