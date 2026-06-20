import {
  Bell,
  Car,
  CheckCheck,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Clock3,
  Download,
  Gauge,
  Hash,
  List,
  Locate,
  LocateFixed,
  MapPin,
  Minus,
  Navigation,
  OctagonAlert,
  Phone,
  Plug,
  Plus,
  Power,
  Radio,
  RefreshCw,
  Route,
  Satellite,
  Search,
  SearchX,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  Truck,
  X,
  type LucideIcon,
} from "lucide-react";

// Mapa nombre-kebab (como en el diseño dc.html) -> componente lucide.
const map: Record<string, LucideIcon> = {
  bell: Bell,
  car: Car,
  "check-check": CheckCheck,
  "check-circle": CheckCircle,
  "chevron-down": ChevronDown,
  "chevron-up": ChevronUp,
  clock: Clock,
  "clock-3": Clock3,
  download: Download,
  gauge: Gauge,
  hash: Hash,
  list: List,
  locate: Locate,
  "locate-fixed": LocateFixed,
  "map-pin": MapPin,
  minus: Minus,
  navigation: Navigation,
  "octagon-alert": OctagonAlert,
  phone: Phone,
  plug: Plug,
  plus: Plus,
  power: Power,
  radio: Radio,
  "refresh-cw": RefreshCw,
  route: Route,
  satellite: Satellite,
  search: Search,
  "search-x": SearchX,
  settings: Settings,
  "shield-alert": ShieldAlert,
  "sliders-horizontal": SlidersHorizontal,
  truck: Truck,
  x: X,
};

interface Props {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}

export default function Icon({ name, size = 18, color, strokeWidth = 2, style }: Props) {
  const Cmp = map[name] ?? MapPin;
  return (
    <Cmp
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      style={{ display: "block", ...style }}
    />
  );
}
