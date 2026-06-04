import { useLocation, Link } from "wouter";
import { MapPin, Trophy, Activity, User } from "lucide-react";

const tabs = [
  { href: "/",            label: "Alerts",      Icon: MapPin   },
  { href: "/leaderboard", label: "Leaders",     Icon: Trophy   },
  { href: "/activity",    label: "Activity",    Icon: Activity },
  { href: "/profile",     label: "Profile",     Icon: User     },
];

export default function BottomNav() {
  const [location] = useLocation();

  return (
    <nav
      className="glass border-t border-white/8 flex-shrink-0"
      style={{ borderColor: "rgba(255,255,255,0.06)" }}
      data-testid="bottom-nav"
    >
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map(({ href, label, Icon }) => {
          const active = location === href;
          return (
            <Link key={href} href={href}>
              <button
                data-testid={`nav-tab-${label.toLowerCase()}`}
                className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all duration-200"
                style={active ? { color: "#00b4ff" } : { color: "rgba(255,255,255,0.38)" }}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.5 : 1.8}
                  style={active ? { filter: "drop-shadow(0 0 6px rgba(0,180,255,0.7))" } : {}}
                />
                <span
                  className="text-[10px] font-medium tracking-wide"
                  style={active ? { textShadow: "0 0 8px rgba(0,180,255,0.6)" } : {}}
                >
                  {label}
                </span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
