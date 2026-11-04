type BrandLogoProps = { iconSize?: number; className?: string; wordmarkClassName?: string };

export function BrandMark({ size = 36, className = '' }: { size?: number; className?: string }) {
  return <img src="/brand-mark.svg" width={size} height={size} alt="" aria-hidden="true" className={`block shrink-0 ${className}`} />;
}

export function BrandWordmark({ className = '' }: { className?: string }) {
  return <span className={`truncate text-base font-semibold tracking-tight text-foreground ${className}`}>La Pizzara</span>;
}

export function BrandLogo({ iconSize = 38, className = '', wordmarkClassName = '' }: BrandLogoProps) {
  return <span className={`inline-flex min-w-0 items-center gap-3 ${className}`}>
    <BrandMark size={iconSize}/>
    <BrandWordmark className={wordmarkClassName}/>
  </span>;
}
