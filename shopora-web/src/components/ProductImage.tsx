import { useState } from 'react';

// Shown when a product has no image or the image cannot be loaded (for example, when offline).
const FALLBACK = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#F5F3FF"/>` +
  `<path d="M130 170h140l-10 110a22 22 0 0 1-22 20h-76a22 22 0 0 1-22-20z" fill="#C4B5FD"/>` +
  `<path d="M165 170v-18a35 35 0 0 1 70 0v18" fill="none" stroke="#A78BFA" stroke-width="14" stroke-linecap="round"/></svg>`,
);

export default function ProductImage({ src, alt, className, priority = false }:
  { src: string | null; alt: string; className?: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <img
      className={className}
      src={!src || failed ? FALLBACK : src}
      alt={alt}
      width={600}
      height={600}
      loading={priority ? 'eager' : 'lazy'}
      onError={() => setFailed(true)}
    />
  );
}
