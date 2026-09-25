import dynamic from 'next/dynamic';
import { LucideProps } from 'lucide-react';
import dynamicIconImports from 'lucide-react/dynamicIconImports';
import { memo } from 'react';

export type IconName = keyof typeof dynamicIconImports;

interface IconProps extends LucideProps {
  name: IconName;
}

export const DynamicIcon = memo(({ name, ...props }: IconProps) => {
  const LucideIcon = dynamic(dynamicIconImports[name], {
    loading: () => <div className="w-6 h-6 rounded-md bg-slate-100 animate-pulse" />,
  });

  return <LucideIcon {...props} />;
});

DynamicIcon.displayName = 'DynamicIcon';
