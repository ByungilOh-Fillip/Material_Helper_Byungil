import { BookOpen, Boxes, FlaskConical, GitBranch, Shapes } from "lucide-react";

interface HeaderProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const sections = [
  { id: "encyclopedia", label: "Node Encyclopedia", icon: BookOpen },
  { id: "sandbox", label: "Interactive Sandbox", icon: GitBranch },
  { id: "learning", label: "Learning Recipes", icon: Boxes },
  { id: "versions", label: "UE 5.7 Notes", icon: FlaskConical }
];

export function Header({ activeSection, onSectionChange }: HeaderProps) {
  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">Material Learning Sandbox</p>
        <h1>Material Helper</h1>
      </div>
      <nav aria-label="Primary sections">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              className={activeSection === section.id ? "active" : ""}
              type="button"
              onClick={() => onSectionChange(section.id)}
              title={section.label}
            >
              <Icon size={17} />
              <span>{section.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
