import Link from "next/link";
import { ArrowUpRight, CircleDollarSign, ListFilter, Palette, ShieldCheck, UserRound, Settings2 } from "lucide-react";

const groups = [
  {
    title: "Control",
    description: "Set the structure around how your money is organized.",
    links: [
      { title: "Rules", detail: "Financial logic and controls", href: "/rules", icon: ListFilter },
      { title: "Receive money", detail: "Your Arezak account details", href: "/receive", icon: CircleDollarSign },
    ],
  },
  {
    title: "Account",
    description: "Your identity, access and preferences.",
    links: [
      { title: "Profile", detail: "Personal information and photo", href: "/settings/profile", icon: UserRound },
      { title: "Security", detail: "Protect your account", href: "/settings/security", icon: ShieldCheck },
      { title: "Appearance", detail: "Light, dark or system theme", href: "/settings/appearance", icon: Palette },
      { title: "Settings", detail: "Account preferences", href: "/settings", icon: Settings2 },
    ],
  },
];

export default function MorePage() {
  return (
    <div className="page-frame more-page">
      <header className="page-heading">
        <div><p className="page-eyebrow">AREZAK / ACCOUNT</p><h1>More</h1><p>Manage the parts of Arezak that support your money system.</p></div>
      </header>
      {groups.map((group) => (
        <section className="more-group" key={group.title} aria-labelledby={`more-${group.title.toLowerCase()}`}>
          <div className="more-group-heading"><div><p className="section-kicker">{group.title}</p><h2 id={`more-${group.title.toLowerCase()}`}>{group.description}</h2></div></div>
          <div className="more-link-list">
            {group.links.map(({ title, detail, href, icon: Icon }) => (
              <Link className="more-link" href={href} key={href}>
                <span className="more-link-icon"><Icon size={18} aria-hidden="true" /></span>
                <span className="more-link-copy"><strong>{title}</strong><small>{detail}</small></span>
                <ArrowUpRight size={16} className="more-link-arrow" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
