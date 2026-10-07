import Link from "next/link";
import { ArrowUpRight, CircleDollarSign, ListFilter, Palette, ShieldCheck, UserRound, Settings2, Info } from "lucide-react";

const groups = [
  {
    title: "Money",
    links: [
      { title: "Accounts", href: "/accounts", icon: CircleDollarSign },
    ],
  },
  {
    title: "Control",
    links: [
      { title: "Rules", href: "/rules", icon: ListFilter },
    ],
  },
  {
    title: "Account",
    links: [
      { title: "Profile", href: "/settings/profile", icon: UserRound },
      { title: "Security", href: "/settings/security", icon: ShieldCheck },
      { title: "Appearance", href: "/settings/appearance", icon: Palette },
      { title: "Settings", href: "/settings", icon: Settings2 },
      { title: "About", href: "/settings/about", icon: Info },
    ],
  },
];

export default function MorePage() {
  return (
    <div className="page-frame more-page">
      <header className="page-heading"><div><h1>More</h1></div></header>
      {groups.map((group) => (
        <section className="more-group" key={group.title} aria-labelledby={`more-${group.title.toLowerCase()}`}>
          <h2 className="more-group-title" id={`more-${group.title.toLowerCase()}`}>{group.title}</h2>
          <div className="more-link-list">
            {group.links.map(({ title, href, icon: Icon }) => (
              <Link className="more-link" href={href} key={href}>
                <span className="more-link-icon"><Icon size={18} aria-hidden="true" /></span>
                <span className="more-link-copy"><strong>{title}</strong></span>
                <ArrowUpRight size={16} className="more-link-arrow" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
