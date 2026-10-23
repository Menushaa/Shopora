import { useEffect } from 'react';

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} | Shopora` : 'Shopora - Your World of Shopping';
  }, [title]);
}
