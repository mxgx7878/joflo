// lucide-react icons with the same stroke width the original page used (lucide.createIcons({ attrs:{ 'stroke-width':1.7 } }))
import * as L from 'lucide-react';

const w = (C) => {
  const Icon = (props) => <C strokeWidth={1.7} aria-hidden="true" {...props} />;
  Icon.displayName = C.displayName;
  return Icon;
};

export const Globe2 = w(L.Globe2);
export const BadgeCheck = w(L.BadgeCheck);
export const Ship = w(L.Ship);
export const Menu = w(L.Menu);
export const Search = w(L.Search);
export const UserRound = w(L.UserRound);
export const Heart = w(L.Heart);
export const ShoppingBag = w(L.ShoppingBag);
export const LayoutGrid = w(L.LayoutGrid);
export const ChevronDown = w(L.ChevronDown);
export const ChevronLeft = w(L.ChevronLeft);
export const ChevronRight = w(L.ChevronRight);
export const PackageCheck = w(L.PackageCheck);
export const ArrowRight = w(L.ArrowRight);
export const Layers3 = w(L.Layers3);
export const PackageOpen = w(L.PackageOpen);
export const PackageSearch = w(L.PackageSearch);
export const Info = w(L.Info);
export const Wheat = w(L.Wheat);
export const Sparkles = w(L.Sparkles);
export const Send = w(L.Send);
export const Home = w(L.Home);
export const Store = w(L.Store);
export const X = w(L.X);
export const Lock = w(L.Lock);
export const Minus = w(L.Minus);
export const Plus = w(L.Plus);
export const Eye = w(L.Eye);
export const Mail = w(L.Mail);
export const Trash2 = w(L.Trash2);
export const CircleCheck = w(L.CircleCheck);
