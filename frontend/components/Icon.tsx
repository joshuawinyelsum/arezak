import React from 'react';
import dynamic from 'next/dynamic';
import dynamicIconImports from 'lucide-react/dynamicIconImports';

export type IconName = keyof typeof dynamicIconImports;

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: string;
  className?: string;
}

// Convert PascalCase to kebab-case
const toKebab = (str: string) => str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

export const Icon = React.memo(({ name, ...props }: IconProps) => {
  const kebabName = toKebab(name);
  
  if (!(kebabName in dynamicIconImports)) {
    // Fallback if icon not found
    const Fallback = dynamic(dynamicIconImports['target']);
    return <Fallback {...props} />;
  }

  const LucideIcon = dynamic(dynamicIconImports[kebabName as IconName], {
    loading: () => <div className={props.className} style={{ width: '1em', height: '1em', backgroundColor: 'currentColor', opacity: 0.2, borderRadius: '20%' }} />
  });

  return <LucideIcon {...props} />;
});

Icon.displayName = 'Icon';

