import type { UserRole } from '@/types/review';
import { ROLE_PROFILES } from '@/types/review';

interface RoleSwitcherProps {
  role: UserRole;
  onChange: (role: UserRole) => void;
}

export function RoleSwitcher({ role, onChange }: RoleSwitcherProps) {
  return (
    <div className="role-switcher">
      <span className="role-switcher-label">当前角色</span>
      <select
        className="select role-switcher-select"
        value={role}
        onChange={(e) => onChange(e.target.value as UserRole)}
        aria-label="切换角色"
      >
        {(Object.keys(ROLE_PROFILES) as UserRole[]).map((id) => (
          <option key={id} value={id}>
            {ROLE_PROFILES[id].name}-{ROLE_PROFILES[id].dept}
          </option>
        ))}
      </select>
    </div>
  );
}
