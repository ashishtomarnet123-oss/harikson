import { useEffect } from 'react';
import { formatPageTitle, DEFAULT_PAGE_TITLE } from '../lib/documentTitle';

/**
 * Custom React hook to dynamically update document.title for the active browser tab.
 * 
 * Supports:
 * - Reactive updates when conversation title changes or streams
 * - Multi-tab isolation (each tab instance retains its own active title)
 * - Restores default title on unmount if requested
 */
export function useDocumentTitle(title, retainOnUnmount = false) {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const formatted = formatPageTitle(title);
    if (document.title !== formatted) {
      document.title = formatted;
    }
  }, [title]);

  useEffect(() => {
    return () => {
      if (!retainOnUnmount && typeof document !== 'undefined') {
        document.title = DEFAULT_PAGE_TITLE;
      }
    };
  }, [retainOnUnmount]);
}

export default useDocumentTitle;
